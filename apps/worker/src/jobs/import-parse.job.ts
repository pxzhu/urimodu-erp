import { extname } from "node:path";
import { Readable } from "node:stream";

import { JobStatus, PrismaClient, Prisma } from "@prisma/client";
import { read, utils } from "xlsx";

import { getDefaultWorkerStorage, type WorkerObjectStorage } from "../common/object-storage";

const prisma = new PrismaClient();
const storage = getDefaultWorkerStorage();
const WORKER_JOB_STALE_MS = Number(process.env.WORKER_JOB_STALE_MS ?? 10 * 60 * 1000);

interface ParsedVendorRow {
  rowNo: number;
  rawData: Record<string, unknown>;
  code: string;
  name: string;
  registrationNumber?: string;
  isActiveRaw?: string;
}

interface ImportParseDependencies {
  prismaClient?: PrismaClient;
  objectStorage?: WorkerObjectStorage;
  now?: () => Date;
  logger?: Pick<Console, "log" | "error">;
}

const HEADER_ALIASES = {
  code: ["code", "vendor_code", "거래처코드"],
  name: ["name", "vendor_name", "거래처명"],
  registrationNumber: ["registration_number", "registrationnumber", "business_registration_number", "사업자등록번호"],
  isActive: ["is_active", "active", "사용여부", "enabled"]
} as const;

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  const aliasSet = new Set(aliases.map((alias) => normalizeHeader(alias)));
  return headers.findIndex((header) => aliasSet.has(header));
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "y", "yes", "사용", "active"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "n", "no", "미사용", "inactive"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function parseVendorRowsFromCsv(buffer: Buffer): ParsedVendorRow[] {
  const content = buffer.toString("utf8");
  const rawLines = content.split(/\r?\n/);

  const headerLine = rawLines[0];
  if (!headerLine) {
    throw new Error("CSV file is empty");
  }

  const headerCells = parseCsvLine(headerLine).map((value) => normalizeHeader(value));
  const codeIndex = findHeaderIndex(headerCells, HEADER_ALIASES.code);
  const nameIndex = findHeaderIndex(headerCells, HEADER_ALIASES.name);
  const registrationIndex = findHeaderIndex(headerCells, HEADER_ALIASES.registrationNumber);
  const activeIndex = findHeaderIndex(headerCells, HEADER_ALIASES.isActive);

  if (codeIndex < 0 || nameIndex < 0) {
    throw new Error("CSV header must include code and name columns");
  }

  const rows: ParsedVendorRow[] = [];

  for (let lineIndex = 1; lineIndex < rawLines.length; lineIndex += 1) {
    const line = rawLines[lineIndex];
    if (!line || line.trim().length === 0) {
      continue;
    }

    const cells = parseCsvLine(line);
    const rowNo = lineIndex + 1;
    const rawData = Object.fromEntries(
      headerCells.map((header, index) => [header || `col_${index + 1}`, (cells[index] ?? "").trim()])
    );

    rows.push({
      rowNo,
      rawData,
      code: (cells[codeIndex] ?? "").trim(),
      name: (cells[nameIndex] ?? "").trim(),
      registrationNumber: registrationIndex >= 0 ? (cells[registrationIndex] ?? "").trim() || undefined : undefined,
      isActiveRaw: activeIndex >= 0 ? (cells[activeIndex] ?? "").trim() || undefined : undefined
    });
  }

  return rows;
}

function parseVendorRowsFromXlsx(buffer: Buffer): ParsedVendorRow[] {
  const workbook = read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("XLSX workbook has no sheets");
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  if (!firstSheet) {
    throw new Error("XLSX sheet is unavailable");
  }

  const matrix = utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    raw: false,
    defval: ""
  });

  const headerRow = matrix[0];
  if (!headerRow || headerRow.length === 0) {
    throw new Error("XLSX header row is missing");
  }

  const headerCells = headerRow.map((value: unknown) => normalizeHeader(value));
  const codeIndex = findHeaderIndex(headerCells, HEADER_ALIASES.code);
  const nameIndex = findHeaderIndex(headerCells, HEADER_ALIASES.name);
  const registrationIndex = findHeaderIndex(headerCells, HEADER_ALIASES.registrationNumber);
  const activeIndex = findHeaderIndex(headerCells, HEADER_ALIASES.isActive);

  if (codeIndex < 0 || nameIndex < 0) {
    throw new Error("XLSX header must include code and name columns");
  }

  const rows: ParsedVendorRow[] = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const sourceRow = matrix[rowIndex] ?? [];
    const cells = sourceRow.map((cell: unknown) => String(cell ?? "").trim());
    if (cells.every((cell: string) => cell.length === 0)) {
      continue;
    }

    const rowNo = rowIndex + 1;
    const rawData = Object.fromEntries(
      headerCells.map((header: string, index: number) => [header || `col_${index + 1}`, (cells[index] ?? "").trim()])
    );

    rows.push({
      rowNo,
      rawData,
      code: (cells[codeIndex] ?? "").trim(),
      name: (cells[nameIndex] ?? "").trim(),
      registrationNumber: registrationIndex >= 0 ? (cells[registrationIndex] ?? "").trim() || undefined : undefined,
      isActiveRaw: activeIndex >= 0 ? (cells[activeIndex] ?? "").trim() || undefined : undefined
    });
  }

  return rows;
}

function parseVendorRows(fileName: string, buffer: Buffer): ParsedVendorRow[] {
  const extension = extname(fileName).toLowerCase();
  if (extension === ".csv") {
    return parseVendorRowsFromCsv(buffer);
  }

  if (extension === ".xlsx") {
    return parseVendorRowsFromXlsx(buffer);
  }

  throw new Error("Only .csv and .xlsx files are supported for vendor import");
}

function buildImportSummary(input: { totalRows: number; createdRows: number; updatedRows: number; failedRows: number }) {
  return {
    totalRows: input.totalRows,
    createdRows: input.createdRows,
    updatedRows: input.updatedRows,
    failedRows: input.failedRows
  };
}

function buildStaleRunningFilter(staleBefore: Date): Prisma.ImportJobWhereInput {
  return {
    status: JobStatus.RUNNING,
    OR: [{ startedAt: null }, { startedAt: { lte: staleBefore } }]
  };
}

export function buildImportJobClaimWhere(now: Date): Prisma.ImportJobWhereInput {
  const staleBefore = new Date(now.getTime() - WORKER_JOB_STALE_MS);
  return {
    type: "VENDOR",
    OR: [{ status: JobStatus.PENDING }, buildStaleRunningFilter(staleBefore)]
  };
}

async function claimNextVendorImportJob(prismaClient: PrismaClient, now: Date) {
  const staleBefore = new Date(now.getTime() - WORKER_JOB_STALE_MS);
  const claimableWhere = buildImportJobClaimWhere(now);
  const pending = await prismaClient.importJob.findFirst({
    where: claimableWhere,
    include: {
      sourceFile: {
        select: {
          id: true,
          storageKey: true,
          originalName: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!pending) {
    return null;
  }

  const claimed = await prismaClient.importJob.updateMany({
    where: {
      id: pending.id,
      OR: [{ status: JobStatus.PENDING }, buildStaleRunningFilter(staleBefore)]
    },
    data: {
      status: JobStatus.RUNNING,
      startedAt: now,
      finishedAt: null,
      errorMessage: null
    }
  });

  if (claimed.count === 0) {
    return null;
  }

  return prismaClient.importJob.findUnique({
    where: { id: pending.id },
    include: {
      sourceFile: {
        select: {
          id: true,
          storageKey: true,
          originalName: true
        }
      }
    }
  });
}

export async function processVendorImportJob(input: {
  prismaClient: PrismaClient;
  objectStorage: WorkerObjectStorage;
  importJobId: string;
  now: Date;
  logger: Pick<Console, "log" | "error">;
}): Promise<void> {
  const job = await input.prismaClient.importJob.findUnique({
    where: { id: input.importJobId },
    include: {
      sourceFile: {
        select: {
          id: true,
          storageKey: true,
          originalName: true
        }
      }
    }
  });

  if (!job) {
    return;
  }

  if (!job.sourceFile) {
    const errorMessage = "Import source file is missing";
    await input.prismaClient.importJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        errorMessage,
        finishedAt: input.now
      }
    });

    await input.prismaClient.auditLog.create({
      data: {
        companyId: job.companyId,
        actorId: job.requestedById,
        entityType: "ImportJob",
        entityId: job.id,
        action: "IMPORT_JOB_FAILED",
        afterJson: {
          status: JobStatus.FAILED,
          errorMessage
        }
      }
    });

    return;
  }

  try {
    const object = await input.objectStorage.getObject(job.sourceFile.storageKey);
    const fileBuffer = await streamToBuffer(object.stream);
    const parsedRows = parseVendorRows(job.sourceFile.originalName, fileBuffer);

    const seenCodes = new Set<string>();
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    for (const row of parsedRows) {
      try {
        const normalizedCode = row.code.trim().toUpperCase();
        const normalizedName = row.name.trim();
        const isActive = parseBoolean(row.isActiveRaw);

        if (!normalizedCode) {
          throw new Error("code is required");
        }

        if (!normalizedName) {
          throw new Error("name is required");
        }

        if (seenCodes.has(normalizedCode)) {
          throw new Error(`duplicate code in source file: ${normalizedCode}`);
        }

        seenCodes.add(normalizedCode);

        const existing = await input.prismaClient.vendor.findUnique({
          where: {
            companyId_code: {
              companyId: job.companyId,
              code: normalizedCode
            }
          },
          select: {
            id: true
          }
        });

        const saved = await input.prismaClient.vendor.upsert({
          where: {
            companyId_code: {
              companyId: job.companyId,
              code: normalizedCode
            }
          },
          update: {
            name: normalizedName,
            registrationNumber: row.registrationNumber ?? null,
            isActive
          },
          create: {
            companyId: job.companyId,
            code: normalizedCode,
            name: normalizedName,
            registrationNumber: row.registrationNumber ?? null,
            isActive
          }
        });

        await input.prismaClient.importJobRow.upsert({
          where: {
            importJobId_rowNo: {
              importJobId: job.id,
              rowNo: row.rowNo
            }
          },
          update: {
            status: JobStatus.SUCCEEDED,
            rawData: toInputJson(row.rawData),
            errorMessage: null
          },
          create: {
            importJobId: job.id,
            rowNo: row.rowNo,
            status: JobStatus.SUCCEEDED,
            rawData: toInputJson(row.rawData)
          }
        });

        if (existing) {
          updatedCount += 1;
        } else {
          createdCount += 1;
        }

        await input.prismaClient.auditLog.create({
          data: {
            companyId: job.companyId,
            actorId: job.requestedById,
            entityType: "Vendor",
            entityId: saved.id,
            action: existing ? "VENDOR_IMPORT_UPDATE" : "VENDOR_IMPORT_CREATE",
            afterJson: {
              code: saved.code,
              name: saved.name,
              importJobId: job.id,
              rowNo: row.rowNo
            }
          }
        });
      } catch (rowError) {
        failedCount += 1;
        const errorMessage = rowError instanceof Error ? rowError.message : "unknown import row error";

        await input.prismaClient.importJobRow.upsert({
          where: {
            importJobId_rowNo: {
              importJobId: job.id,
              rowNo: row.rowNo
            }
          },
          update: {
            status: JobStatus.FAILED,
            rawData: toInputJson(row.rawData),
            errorMessage
          },
          create: {
            importJobId: job.id,
            rowNo: row.rowNo,
            status: JobStatus.FAILED,
            rawData: toInputJson(row.rawData),
            errorMessage
          }
        });
      }
    }

    const summary = buildImportSummary({
      totalRows: parsedRows.length,
      createdRows: createdCount,
      updatedRows: updatedCount,
      failedRows: failedCount
    });

    const finalStatus = failedCount > 0 ? JobStatus.FAILED : JobStatus.SUCCEEDED;
    const errorMessage = failedCount > 0 ? `${failedCount} row(s) failed validation` : null;

    await input.prismaClient.importJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        summaryJson: toInputJson(summary),
        errorMessage,
        finishedAt: input.now
      }
    });

    await input.prismaClient.auditLog.create({
      data: {
        companyId: job.companyId,
        actorId: job.requestedById,
        entityType: "ImportJob",
        entityId: job.id,
        action: "IMPORT_JOB_COMPLETE",
        afterJson: {
          status: finalStatus,
          ...summary,
          errorMessage
        }
      }
    });

    input.logger.log(
      `[worker] import job completed id=${job.id} status=${finalStatus} rows=${summary.totalRows} failed=${summary.failedRows}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Import failed";

    await input.prismaClient.importJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        errorMessage,
        finishedAt: input.now
      }
    });

    await input.prismaClient.auditLog.create({
      data: {
        companyId: job.companyId,
        actorId: job.requestedById,
        entityType: "ImportJob",
        entityId: job.id,
        action: "IMPORT_JOB_FAILED",
        afterJson: {
          status: JobStatus.FAILED,
          errorMessage
        }
      }
    });

    input.logger.error(`[worker] import job failed id=${job.id} error=${errorMessage}`);
  }
}

export async function importParseJob(dependencies: ImportParseDependencies = {}): Promise<void> {
  const prismaClient = dependencies.prismaClient ?? prisma;
  const objectStorage = dependencies.objectStorage ?? storage;
  const now = (dependencies.now ?? (() => new Date()))();
  const logger = dependencies.logger ?? console;

  const claimed = await claimNextVendorImportJob(prismaClient, now);
  if (!claimed) {
    return;
  }

  await processVendorImportJob({
    prismaClient,
    objectStorage,
    importJobId: claimed.id,
    now,
    logger
  });
}
