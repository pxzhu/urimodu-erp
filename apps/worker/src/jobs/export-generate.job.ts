import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";

import { ExpenseStatus, JobStatus, Prisma, PrismaClient } from "@prisma/client";

import { getDefaultWorkerStorage, type WorkerObjectStorage } from "../common/object-storage";

const prisma = new PrismaClient();
const storage = getDefaultWorkerStorage();
const WORKER_JOB_STALE_MS = Number(process.env.WORKER_JOB_STALE_MS ?? 10 * 60 * 1000);

interface ExportGenerateDependencies {
  prismaClient?: PrismaClient;
  objectStorage?: WorkerObjectStorage;
  now?: () => Date;
  logger?: Pick<Console, "log" | "error">;
}

interface ExpenseClaimExportFilter {
  format: "CSV" | "JSON";
  status?: ExpenseStatus;
  fromDate?: string;
  toDate?: string;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function dateOnlyStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateOnlyEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function buildCreatedAtRange(fromDate?: string, toDate?: string) {
  return {
    gte: fromDate ? dateOnlyStart(fromDate) : undefined,
    lte: toDate ? dateOnlyEnd(toDate) : undefined
  };
}

function parseExportFilter(filterJson: Prisma.JsonValue | null): ExpenseClaimExportFilter {
  const fallback: ExpenseClaimExportFilter = { format: "CSV" };

  if (!filterJson || typeof filterJson !== "object" || Array.isArray(filterJson)) {
    return fallback;
  }

  const rawFormat = (filterJson as { format?: unknown }).format;
  const format = rawFormat === "JSON" ? "JSON" : "CSV";

  const rawStatus = (filterJson as { status?: unknown }).status;
  const status =
    rawStatus === "DRAFT" ||
    rawStatus === "SUBMITTED" ||
    rawStatus === "APPROVED" ||
    rawStatus === "REJECTED" ||
    rawStatus === "POSTED"
      ? rawStatus
      : undefined;

  const fromDateValue = (filterJson as { fromDate?: unknown }).fromDate;
  const toDateValue = (filterJson as { toDate?: unknown }).toDate;

  return {
    format,
    status,
    fromDate: typeof fromDateValue === "string" ? fromDateValue : undefined,
    toDate: typeof toDateValue === "string" ? toDateValue : undefined
  };
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

function normalizeExtension(fileName: string): string | null {
  const extension = extname(fileName).trim().toLowerCase();
  return extension ? extension.replace(/^\./, "") : null;
}

function buildStorageKey(companyId: string, originalName: string): string {
  const datePrefix = new Date().toISOString().slice(0, 10);
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${companyId}/${datePrefix}/${randomUUID()}-${safeName}`;
}

function buildStaleRunningFilter(staleBefore: Date): Prisma.ExportJobWhereInput {
  return {
    status: JobStatus.RUNNING,
    OR: [{ startedAt: null }, { startedAt: { lte: staleBefore } }]
  };
}

export function buildExportJobClaimWhere(now: Date): Prisma.ExportJobWhereInput {
  const staleBefore = new Date(now.getTime() - WORKER_JOB_STALE_MS);
  return {
    type: "EXPENSE_CLAIMS",
    OR: [{ status: JobStatus.PENDING }, buildStaleRunningFilter(staleBefore)]
  };
}

async function claimNextExpenseExportJob(prismaClient: PrismaClient, now: Date) {
  const staleBefore = new Date(now.getTime() - WORKER_JOB_STALE_MS);
  const claimableWhere = buildExportJobClaimWhere(now);
  const pending = await prismaClient.exportJob.findFirst({
    where: claimableWhere,
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!pending) {
    return null;
  }

  const claimed = await prismaClient.exportJob.updateMany({
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

  return prismaClient.exportJob.findUnique({
    where: { id: pending.id }
  });
}

export async function processExpenseClaimExportJob(input: {
  prismaClient: PrismaClient;
  objectStorage: WorkerObjectStorage;
  exportJobId: string;
  now: Date;
  logger: Pick<Console, "log" | "error">;
}): Promise<void> {
  const job = await input.prismaClient.exportJob.findUnique({
    where: { id: input.exportJobId }
  });

  if (!job) {
    return;
  }

  try {
    const filter = parseExportFilter(job.filterJson as Prisma.JsonValue | null);

    const claims = await input.prismaClient.expenseClaim.findMany({
      where: {
        companyId: job.companyId,
        status: filter.status,
        createdAt: buildCreatedAtRange(filter.fromDate, filter.toDate)
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
      orderBy: {
        createdAt: "desc"
      }
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
      filter.format === "CSV"
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

    const extension = filter.format === "CSV" ? "csv" : "json";
    const mimeType = filter.format === "CSV" ? "text/csv" : "application/json";
    const fileName = `expense-claims-export-${input.now.toISOString().slice(0, 10)}.${extension}`;
    const buffer = Buffer.from(payload, "utf8");
    const storageKey = buildStorageKey(job.companyId, fileName);
    const checksumSha256 = createHash("sha256").update(buffer).digest("hex");

    await input.objectStorage.putObject({
      key: storageKey,
      contentType: mimeType,
      body: buffer,
      metadata: {
        "x-company-id": job.companyId,
        "x-uploaded-by": job.requestedById,
        "x-export-job-id": job.id
      }
    });

    const resultFile = await input.prismaClient.fileObject.create({
      data: {
        companyId: job.companyId,
        uploadedById: job.requestedById,
        bucket: process.env.MINIO_BUCKET ?? "erp-files",
        storageKey,
        originalName: fileName,
        mimeType,
        extension: normalizeExtension(fileName),
        sizeBytes: BigInt(buffer.byteLength),
        checksumSha256,
        metadata: toInputJson({
          exportJobId: job.id,
          type: "EXPENSE_CLAIMS",
          format: filter.format,
          rowCount: rows.length
        })
      }
    });

    const summary = {
      rowCount: rows.length,
      format: filter.format,
      resultFileId: resultFile.id
    };

    await input.prismaClient.exportJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.SUCCEEDED,
        resultFileId: resultFile.id,
        summaryJson: toInputJson(summary),
        finishedAt: input.now
      }
    });

    await input.prismaClient.auditLog.create({
      data: {
        companyId: job.companyId,
        actorId: job.requestedById,
        entityType: "ExportJob",
        entityId: job.id,
        action: "EXPORT_JOB_RESULT_UPLOAD",
        afterJson: {
          resultFileId: resultFile.id,
          storageKey: resultFile.storageKey,
          originalName: resultFile.originalName,
          sizeBytes: resultFile.sizeBytes.toString()
        }
      }
    });

    await input.prismaClient.auditLog.create({
      data: {
        companyId: job.companyId,
        actorId: job.requestedById,
        entityType: "ExportJob",
        entityId: job.id,
        action: "EXPORT_JOB_COMPLETE",
        afterJson: {
          status: JobStatus.SUCCEEDED,
          ...summary
        }
      }
    });

    input.logger.log(`[worker] export job completed id=${job.id} rows=${summary.rowCount} format=${summary.format}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Export failed";

    await input.prismaClient.exportJob.update({
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
        entityType: "ExportJob",
        entityId: job.id,
        action: "EXPORT_JOB_FAILED",
        afterJson: {
          status: JobStatus.FAILED,
          errorMessage
        }
      }
    });

    input.logger.error(`[worker] export job failed id=${job.id} error=${errorMessage}`);
  }
}

export async function exportGenerateJob(dependencies: ExportGenerateDependencies = {}): Promise<void> {
  const prismaClient = dependencies.prismaClient ?? prisma;
  const objectStorage = dependencies.objectStorage ?? storage;
  const now = (dependencies.now ?? (() => new Date()))();
  const logger = dependencies.logger ?? console;

  const claimed = await claimNextExpenseExportJob(prismaClient, now);
  if (!claimed) {
    return;
  }

  await processExpenseClaimExportJob({
    prismaClient,
    objectStorage,
    exportJobId: claimed.id,
    now,
    logger
  });
}
