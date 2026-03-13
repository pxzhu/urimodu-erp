import { extname } from "node:path";
import { Readable } from "node:stream";

import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ExpenseStatus, JobStatus, Prisma, type MembershipRole } from "@prisma/client";
import { read, utils } from "xlsx";

import type { AuthContext } from "../../../common/auth/request-context";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { OBJECT_STORAGE } from "../../../common/storage/storage.constants";
import type { ObjectStorage } from "../../../common/storage/storage.interface";
import { toSerializable } from "../../../common/utils/serialization.util";
import { AuditService } from "../../audit/services/audit.service";
import { FilesService } from "../../files/services/files.service";
import type { CreateExpenseClaimExportJobDto } from "../dto/create-expense-claim-export-job.dto";
import type { CreateVendorImportJobDto } from "../dto/create-vendor-import-job.dto";
import type { ExportJobQueryDto } from "../dto/export-job-query.dto";
import type { ImportJobQueryDto } from "../dto/import-job-query.dto";

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

interface ParsedVendorRow {
  rowNo: number;
  rawData: Record<string, unknown>;
  code: string;
  name: string;
  registrationNumber?: string;
  isActiveRaw?: string;
}

const ADMIN_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

const HEADER_ALIASES = {
  code: ["code", "vendor_code", "거래처코드"],
  name: ["name", "vendor_name", "거래처명"],
  registrationNumber: ["registration_number", "registrationnumber", "business_registration_number", "사업자등록번호"],
  isActive: ["is_active", "active", "사용여부", "enabled"]
} as const;

function dateOnlyStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateOnlyEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
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

  throw new BadRequestException(`Invalid boolean value: ${value}`);
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function buildCsv(headers: string[], rows: Array<Record<string, string>>): string {
  function escapeCell(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replaceAll('"', '""')}"`;
    }

    return value;
  }

  const headerLine = headers.map((header) => escapeCell(header)).join(",");
  const dataLines = rows.map((row) => headers.map((header) => escapeCell(row[header] ?? "")).join(","));

  return [headerLine, ...dataLines].join("\n");
}

@Injectable()
export class ImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly filesService: FilesService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage
  ) {}

  private assertAdminRole(auth: AuthContext) {
    if (!ADMIN_ROLES.includes(auth.role)) {
      throw new ForbiddenException("Role not allowed");
    }
  }

  private buildCreatedAtRange(fromDate?: string, toDate?: string) {
    return {
      gte: fromDate ? dateOnlyStart(fromDate) : undefined,
      lte: toDate ? dateOnlyEnd(toDate) : undefined
    };
  }

  private async parseVendorRowsFromCsv(buffer: Buffer): Promise<ParsedVendorRow[]> {
    const content = buffer.toString("utf8");
    const rawLines = content.split(/\r?\n/);

    const headerLine = rawLines[0];
    if (!headerLine) {
      throw new BadRequestException("CSV file is empty");
    }

    const headerCells = parseCsvLine(headerLine).map((value) => normalizeHeader(value));
    const codeIndex = findHeaderIndex(headerCells, HEADER_ALIASES.code);
    const nameIndex = findHeaderIndex(headerCells, HEADER_ALIASES.name);
    const registrationIndex = findHeaderIndex(headerCells, HEADER_ALIASES.registrationNumber);
    const activeIndex = findHeaderIndex(headerCells, HEADER_ALIASES.isActive);

    if (codeIndex < 0 || nameIndex < 0) {
      throw new BadRequestException("CSV header must include code and name columns");
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

      const code = (cells[codeIndex] ?? "").trim();
      const name = (cells[nameIndex] ?? "").trim();
      const registrationNumber = registrationIndex >= 0 ? (cells[registrationIndex] ?? "").trim() : "";
      const activeRaw = activeIndex >= 0 ? (cells[activeIndex] ?? "").trim() : "";

      rows.push({
        rowNo,
        rawData,
        code,
        name,
        registrationNumber: registrationNumber || undefined,
        isActiveRaw: activeRaw || undefined
      });
    }

    return rows;
  }

  private async parseVendorRowsFromXlsx(buffer: Buffer): Promise<ParsedVendorRow[]> {
    const workbook = read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException("XLSX workbook has no sheets");
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    if (!firstSheet) {
      throw new BadRequestException("XLSX sheet is unavailable");
    }

    const matrix = utils.sheet_to_json<unknown[]>(firstSheet, {
      header: 1,
      raw: false,
      defval: ""
    });

    const headerRow = matrix[0];
    if (!headerRow || headerRow.length === 0) {
      throw new BadRequestException("XLSX header row is missing");
    }

    const headerCells = headerRow.map((value) => normalizeHeader(value));
    const codeIndex = findHeaderIndex(headerCells, HEADER_ALIASES.code);
    const nameIndex = findHeaderIndex(headerCells, HEADER_ALIASES.name);
    const registrationIndex = findHeaderIndex(headerCells, HEADER_ALIASES.registrationNumber);
    const activeIndex = findHeaderIndex(headerCells, HEADER_ALIASES.isActive);

    if (codeIndex < 0 || nameIndex < 0) {
      throw new BadRequestException("XLSX header must include code and name columns");
    }

    const rows: ParsedVendorRow[] = [];

    for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
      const sourceRow = matrix[rowIndex] ?? [];
      const cells = sourceRow.map((cell) => String(cell ?? "").trim());
      if (cells.every((cell) => cell.length === 0)) {
        continue;
      }

      const rowNo = rowIndex + 1;
      const rawData = Object.fromEntries(
        headerCells.map((header, index) => [header || `col_${index + 1}`, (cells[index] ?? "").trim()])
      );

      const code = (cells[codeIndex] ?? "").trim();
      const name = (cells[nameIndex] ?? "").trim();
      const registrationNumber = registrationIndex >= 0 ? (cells[registrationIndex] ?? "").trim() : "";
      const activeRaw = activeIndex >= 0 ? (cells[activeIndex] ?? "").trim() : "";

      rows.push({
        rowNo,
        rawData,
        code,
        name,
        registrationNumber: registrationNumber || undefined,
        isActiveRaw: activeRaw || undefined
      });
    }

    return rows;
  }

  private async parseVendorRows(input: { fileName: string; buffer: Buffer }): Promise<ParsedVendorRow[]> {
    const extension = extname(input.fileName).toLowerCase();

    if (extension === ".csv") {
      return this.parseVendorRowsFromCsv(input.buffer);
    }

    if (extension === ".xlsx") {
      return this.parseVendorRowsFromXlsx(input.buffer);
    }

    throw new BadRequestException("Only .csv and .xlsx files are supported for vendor import");
  }

  async listImportJobs(auth: AuthContext, query: ImportJobQueryDto) {
    const jobs = await this.prisma.importJob.findMany({
      where: {
        companyId: auth.companyId,
        status: query.status,
        type: query.type
      },
      include: {
        sourceFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            rows: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 50
    });

    return toSerializable(jobs);
  }

  async getImportJob(auth: AuthContext, importJobId: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: importJobId },
      include: {
        sourceFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            createdAt: true
          }
        },
        rows: {
          orderBy: { rowNo: "asc" }
        }
      }
    });

    if (!job) {
      throw new NotFoundException("Import job not found");
    }

    if (job.companyId !== auth.companyId) {
      throw new ForbiddenException("Import job access denied");
    }

    return toSerializable(job);
  }

  async createVendorImportJob(auth: AuthContext, dto: CreateVendorImportJobDto, requestMeta: RequestMeta) {
    this.assertAdminRole(auth);

    const sourceFile = await this.filesService.getFileByIdForCompany(auth.companyId, dto.sourceFileId);

    const createdJob = await this.prisma.importJob.create({
      data: {
        companyId: auth.companyId,
        requestedById: auth.userId,
        type: "VENDOR",
        status: JobStatus.RUNNING,
        sourceFileId: sourceFile.id,
        mappingJson: dto.mappingJson ? toInputJson(dto.mappingJson) : undefined,
        startedAt: new Date()
      }
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ImportJob",
      entityId: createdJob.id,
      action: "IMPORT_JOB_CREATE",
      afterJson: {
        type: createdJob.type,
        sourceFileId: createdJob.sourceFileId
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    try {
      const storedObject = await this.storage.getObject(sourceFile.storageKey);
      const fileBuffer = await streamToBuffer(storedObject.stream);
      const parsedRows = await this.parseVendorRows({
        fileName: sourceFile.originalName,
        buffer: fileBuffer
      });

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
            throw new BadRequestException("code is required");
          }

          if (!normalizedName) {
            throw new BadRequestException("name is required");
          }

          if (seenCodes.has(normalizedCode)) {
            throw new BadRequestException(`duplicate code in source file: ${normalizedCode}`);
          }

          seenCodes.add(normalizedCode);

          const existing = await this.prisma.vendor.findUnique({
            where: {
              companyId_code: {
                companyId: auth.companyId,
                code: normalizedCode
              }
            },
            select: { id: true }
          });

          const saved = await this.prisma.vendor.upsert({
            where: {
              companyId_code: {
                companyId: auth.companyId,
                code: normalizedCode
              }
            },
            update: {
              name: normalizedName,
              registrationNumber: row.registrationNumber ?? null,
              isActive
            },
            create: {
              companyId: auth.companyId,
              code: normalizedCode,
              name: normalizedName,
              registrationNumber: row.registrationNumber ?? null,
              isActive
            }
          });

          await this.prisma.importJobRow.create({
            data: {
              importJobId: createdJob.id,
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

          await this.auditService.log({
            companyId: auth.companyId,
            actorId: auth.userId,
            entityType: "Vendor",
            entityId: saved.id,
            action: existing ? "VENDOR_IMPORT_UPDATE" : "VENDOR_IMPORT_CREATE",
            afterJson: {
              code: saved.code,
              name: saved.name,
              importJobId: createdJob.id,
              rowNo: row.rowNo
            },
            ipAddress: requestMeta.ipAddress,
            userAgent: requestMeta.userAgent
          });
        } catch (rowError) {
          failedCount += 1;
          const message = rowError instanceof Error ? rowError.message : "unknown import row error";

          await this.prisma.importJobRow.create({
            data: {
              importJobId: createdJob.id,
              rowNo: row.rowNo,
              status: JobStatus.FAILED,
              rawData: toInputJson(row.rawData),
              errorMessage: message
            }
          });
        }
      }

      const summary = {
        totalRows: parsedRows.length,
        createdRows: createdCount,
        updatedRows: updatedCount,
        failedRows: failedCount
      };

      const finalStatus = failedCount > 0 ? JobStatus.FAILED : JobStatus.SUCCEEDED;
      const errorMessage = failedCount > 0 ? `${failedCount} row(s) failed validation` : null;

      await this.prisma.importJob.update({
        where: { id: createdJob.id },
        data: {
          status: finalStatus,
          summaryJson: toInputJson(summary),
          errorMessage,
          finishedAt: new Date()
        }
      });

      await this.auditService.log({
        companyId: auth.companyId,
        actorId: auth.userId,
        entityType: "ImportJob",
        entityId: createdJob.id,
        action: "IMPORT_JOB_COMPLETE",
        afterJson: {
          status: finalStatus,
          ...summary,
          errorMessage
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      });

      return this.getImportJob(auth, createdJob.id);
    } catch (error) {
      await this.prisma.importJob.update({
        where: { id: createdJob.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Import failed",
          finishedAt: new Date()
        }
      });

      await this.auditService.log({
        companyId: auth.companyId,
        actorId: auth.userId,
        entityType: "ImportJob",
        entityId: createdJob.id,
        action: "IMPORT_JOB_FAILED",
        afterJson: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Import failed"
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      });

      throw error;
    }
  }

  async listExportJobs(auth: AuthContext, query: ExportJobQueryDto) {
    const jobs = await this.prisma.exportJob.findMany({
      where: {
        companyId: auth.companyId,
        status: query.status,
        type: query.type
      },
      include: {
        resultFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 50
    });

    return toSerializable(jobs);
  }

  async getExportJob(auth: AuthContext, exportJobId: string) {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: exportJobId },
      include: {
        resultFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true
          }
        }
      }
    });

    if (!job) {
      throw new NotFoundException("Export job not found");
    }

    if (job.companyId !== auth.companyId) {
      throw new ForbiddenException("Export job access denied");
    }

    return toSerializable(job);
  }

  async createExpenseClaimExportJob(auth: AuthContext, dto: CreateExpenseClaimExportJobDto, requestMeta: RequestMeta) {
    this.assertAdminRole(auth);

    const createdJob = await this.prisma.exportJob.create({
      data: {
        companyId: auth.companyId,
        requestedById: auth.userId,
        type: "EXPENSE_CLAIMS",
        status: JobStatus.RUNNING,
        filterJson: toInputJson({
          format: dto.format,
          status: dto.status,
          fromDate: dto.fromDate,
          toDate: dto.toDate
        }),
        startedAt: new Date()
      }
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ExportJob",
      entityId: createdJob.id,
      action: "EXPORT_JOB_CREATE",
      afterJson: {
        type: createdJob.type,
        format: dto.format
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    try {
      const claims = await this.prisma.expenseClaim.findMany({
        where: {
          companyId: auth.companyId,
          status: dto.status,
          createdAt: this.buildCreatedAtRange(dto.fromDate, dto.toDate)
        },
        include: {
          employee: {
            select: {
              employeeNumber: true,
              nameKr: true
            }
          },
          costCenter: {
            select: {
              code: true,
              name: true
            }
          },
          project: {
            select: {
              code: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      const rows = claims.map((claim) => ({
        claim_id: claim.id,
        title: claim.title,
        status: claim.status,
        employee_number: claim.employee.employeeNumber,
        employee_name: claim.employee.nameKr,
        currency: claim.currency,
        total_amount: claim.totalAmount.toString(),
        cost_center_code: claim.costCenter?.code ?? "",
        cost_center_name: claim.costCenter?.name ?? "",
        project_code: claim.project?.code ?? "",
        project_name: claim.project?.name ?? "",
        created_at: claim.createdAt.toISOString()
      }));

      const payload =
        dto.format === "CSV"
          ? buildCsv(
              [
                "claim_id",
                "title",
                "status",
                "employee_number",
                "employee_name",
                "currency",
                "total_amount",
                "cost_center_code",
                "cost_center_name",
                "project_code",
                "project_name",
                "created_at"
              ],
              rows
            )
          : JSON.stringify(rows, null, 2);

      const extension = dto.format === "CSV" ? "csv" : "json";
      const mimeType = dto.format === "CSV" ? "text/csv" : "application/json";
      const fileName = `expense-claims-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
      const buffer = Buffer.from(payload, "utf8");

      const resultFile = await this.filesService.createFileObject(
        auth,
        {
          originalName: fileName,
          mimeType,
          sizeBytes: buffer.byteLength,
          buffer,
          metadata: toInputJson({
            exportJobId: createdJob.id,
            type: "EXPENSE_CLAIMS",
            format: dto.format,
            rowCount: rows.length
          })
        },
        requestMeta,
        {
          action: "EXPORT_JOB_RESULT_UPLOAD",
          entityType: "ExportJob",
          entityId: createdJob.id
        }
      );

      const summary = {
        rowCount: rows.length,
        format: dto.format,
        resultFileId: (resultFile as { id: string }).id
      };

      await this.prisma.exportJob.update({
        where: { id: createdJob.id },
        data: {
          status: JobStatus.SUCCEEDED,
          resultFileId: (resultFile as { id: string }).id,
          summaryJson: toInputJson(summary),
          finishedAt: new Date()
        }
      });

      await this.auditService.log({
        companyId: auth.companyId,
        actorId: auth.userId,
        entityType: "ExportJob",
        entityId: createdJob.id,
        action: "EXPORT_JOB_COMPLETE",
        afterJson: {
          status: JobStatus.SUCCEEDED,
          ...summary
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      });

      return this.getExportJob(auth, createdJob.id);
    } catch (error) {
      await this.prisma.exportJob.update({
        where: { id: createdJob.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Export failed",
          finishedAt: new Date()
        }
      });

      await this.auditService.log({
        companyId: auth.companyId,
        actorId: auth.userId,
        entityType: "ExportJob",
        entityId: createdJob.id,
        action: "EXPORT_JOB_FAILED",
        afterJson: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Export failed"
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      });

      throw error;
    }
  }
}
