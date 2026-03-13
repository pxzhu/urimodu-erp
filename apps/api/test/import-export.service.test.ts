import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";

import { JobStatus } from "@prisma/client";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { ImportExportService } from "../src/modules/import-export/services/import-export.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";
import type { FilesService } from "../src/modules/files/services/files.service";
import type { ObjectStorage } from "../src/common/storage/storage.interface";

test("ImportExportService createVendorImportJob reports row-level errors", async () => {
  const auditLogs: Array<{ action: string }> = [];
  const rows: Array<Record<string, unknown>> = [];
  const vendors = new Map<string, { id: string; code: string; name: string }>();

  let importJobState: {
    id: string;
    companyId: string;
    status: JobStatus;
    type: string;
    sourceFileId: string;
    summaryJson?: Record<string, unknown>;
    errorMessage?: string | null;
  } = {
    id: "job_1",
    companyId: "company_1",
    status: JobStatus.RUNNING,
    type: "VENDOR",
    sourceFileId: "file_1"
  };

  const prisma = {
    importJob: {
      create: async () => ({
        id: "job_1",
        companyId: "company_1",
        status: JobStatus.RUNNING,
        type: "VENDOR",
        sourceFileId: "file_1"
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        importJobState = {
          ...importJobState,
          status: data.status as JobStatus,
          summaryJson: data.summaryJson as Record<string, unknown> | undefined,
          errorMessage: (data.errorMessage as string | null | undefined) ?? null
        };

        return importJobState;
      },
      findUnique: async () => ({
        ...importJobState,
        sourceFile: {
          id: "file_1",
          originalName: "vendors.csv",
          mimeType: "text/csv",
          createdAt: new Date()
        },
        rows
      })
    },
    importJobRow: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        rows.push({ ...data, id: `row_${rows.length + 1}` });
        return data;
      }
    },
    vendor: {
      findUnique: async ({ where }: { where: { companyId_code: { code: string } } }) => {
        return vendors.get(where.companyId_code.code) ?? null;
      },
      upsert: async ({ where, create, update }: { where: { companyId_code: { code: string } }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const existing = vendors.get(where.companyId_code.code);
        const next = existing
          ? {
              ...existing,
              ...update,
              code: where.companyId_code.code
            }
          : {
              id: `vendor_${vendors.size + 1}`,
              code: where.companyId_code.code,
              name: String(create.name)
            };

        vendors.set(where.companyId_code.code, next);
        return next;
      }
    }
  } as unknown as PrismaService;

  const auditService = {
    async log(input: { action: string }) {
      auditLogs.push(input);
      return input;
    }
  } as unknown as AuditService;

  const filesService = {
    async getFileByIdForCompany() {
      return {
        id: "file_1",
        companyId: "company_1",
        storageKey: "imports/vendors.csv",
        originalName: "vendors.csv"
      };
    }
  } as unknown as FilesService;

  const storage = {
    async getObject() {
      const csv = ["code,name,is_active", "VEND-001,서울교통,true", "VEND-002,,true"].join("\n");
      return {
        key: "imports/vendors.csv",
        stream: Readable.from(Buffer.from(csv, "utf8"))
      };
    },
    async putObject() {
      return { key: "unused" };
    }
  } as unknown as ObjectStorage;

  const service = new ImportExportService(prisma, auditService, filesService, storage);

  const result = await service.createVendorImportJob(
    {
      userId: "user_1",
      sessionId: "session_1",
      companyId: "company_1",
      role: "HR_MANAGER",
      memberships: [{ companyId: "company_1", role: "HR_MANAGER", companyName: "Acme Korea" }],
      token: "token"
    },
    {
      sourceFileId: "file_1"
    },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  const summary = (result as { summaryJson?: { createdRows?: number; failedRows?: number }; status?: string }).summaryJson;

  assert.equal((result as { status?: string }).status, JobStatus.FAILED);
  assert.equal(summary?.createdRows, 1);
  assert.equal(summary?.failedRows, 1);
  assert.equal(rows.length, 2);
  assert.equal(auditLogs.some((entry) => entry.action === "IMPORT_JOB_COMPLETE"), true);
});
