import assert from "node:assert/strict";
import test from "node:test";

import { JobStatus } from "@prisma/client";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { ImportExportService } from "../src/modules/import-export/services/import-export.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";
import type { FilesService } from "../src/modules/files/services/files.service";

const adminAuth = {
  userId: "user_1",
  sessionId: "session_1",
  companyId: "company_1",
  role: "HR_MANAGER",
  memberships: [{ companyId: "company_1", role: "HR_MANAGER", companyName: "Acme Korea" }],
  token: "token"
} as const;

test("ImportExportService createVendorImportJob queues async import with PENDING status", async () => {
  const auditLogs: Array<{ action: string }> = [];
  let createdStatus: JobStatus | null = null;

  const prisma = {
    importJob: {
      create: async ({ data }: { data: { status: JobStatus; sourceFileId: string } }) => {
        createdStatus = data.status;
        return {
          id: "job_1",
          companyId: "company_1",
          requestedById: "user_1",
          type: "VENDOR",
          status: data.status,
          sourceFileId: data.sourceFileId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      },
      findUnique: async () => ({
        id: "job_1",
        companyId: "company_1",
        type: "VENDOR",
        status: JobStatus.PENDING,
        sourceFile: {
          id: "file_1",
          originalName: "vendors.csv",
          mimeType: "text/csv",
          createdAt: new Date()
        },
        rows: []
      })
    }
  } as unknown as PrismaService;

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

  const auditService = {
    async log(input: { action: string }) {
      auditLogs.push(input);
      return input;
    }
  } as unknown as AuditService;

  const service = new ImportExportService(prisma, auditService, filesService);

  const result = await service.createVendorImportJob(
    adminAuth,
    {
      sourceFileId: "file_1"
    },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  assert.equal(createdStatus, JobStatus.PENDING);
  assert.equal((result as { status?: string }).status, JobStatus.PENDING);
  assert.equal(auditLogs.some((entry) => entry.action === "IMPORT_JOB_CREATE"), true);
});

test("ImportExportService createExpenseClaimExportJob queues async export with PENDING status", async () => {
  const auditLogs: Array<{ action: string }> = [];

  const prisma = {
    exportJob: {
      create: async ({ data }: { data: { status: JobStatus; type: string } }) => ({
        id: "export_1",
        companyId: "company_1",
        requestedById: "user_1",
        type: data.type,
        status: data.status,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      findUnique: async () => ({
        id: "export_1",
        companyId: "company_1",
        type: "EXPENSE_CLAIMS",
        status: JobStatus.PENDING,
        resultFile: null
      })
    }
  } as unknown as PrismaService;

  const service = new ImportExportService(
    prisma,
    {
      async log(input: { action: string }) {
        auditLogs.push(input);
        return input;
      }
    } as unknown as AuditService,
    {
      async getFileByIdForCompany() {
        throw new Error("not used");
      }
    } as unknown as FilesService
  );

  const result = await service.createExpenseClaimExportJob(
    adminAuth,
    {
      format: "CSV"
    },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  assert.equal((result as { status?: string }).status, JobStatus.PENDING);
  assert.equal(auditLogs.some((entry) => entry.action === "EXPORT_JOB_CREATE"), true);
});
