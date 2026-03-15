import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";

import { JobStatus, type PrismaClient } from "@prisma/client";

import {
  normalizeAttendanceEvents,
  resolveWorkDateKeyForEvent,
  type NormalizationShiftPolicy
} from "../src/jobs/attendance-normalize.job";
import { processVendorImportJob } from "../src/jobs/import-parse.job";
import { processExpenseClaimExportJob } from "../src/jobs/export-generate.job";

test("attendance normalization handles overnight shift check-in/check-out", () => {
  const overnightPolicy: NormalizationShiftPolicy = {
    workStartMinutes: 22 * 60,
    workEndMinutes: 6 * 60,
    breakMinutes: 60,
    graceMinutes: 10
  };

  const result = normalizeAttendanceEvents(
    [
      {
        eventType: "IN",
        eventTimestamp: new Date("2026-03-15T22:00:00.000Z")
      },
      {
        eventType: "BREAK_OUT",
        eventTimestamp: new Date("2026-03-16T02:00:00.000Z")
      },
      {
        eventType: "BREAK_IN",
        eventTimestamp: new Date("2026-03-16T03:00:00.000Z")
      },
      {
        eventType: "OUT",
        eventTimestamp: new Date("2026-03-16T06:00:00.000Z")
      }
    ],
    overnightPolicy
  );

  assert.equal(result.status, "NORMAL");
  assert.equal(result.needsReview, false);
  assert.equal(result.workedMinutes, 420);
  assert.equal(result.overtimeMinutes, 0);
});

test("resolveWorkDateKeyForEvent maps post-midnight event to previous work date for overnight policy", () => {
  const workDate = resolveWorkDateKeyForEvent({
    eventTimestamp: new Date("2026-03-15T20:30:00.000Z"),
    timezone: "Asia/Seoul",
    shiftPolicy: {
      workStartMinutes: 22 * 60,
      workEndMinutes: 6 * 60,
      breakMinutes: 60,
      graceMinutes: 0
    }
  });

  assert.equal(workDate, "2026-03-15");
});

test("worker import job keeps row-level errors and marks job FAILED when any row is invalid", async () => {
  const importJobUpdates: Array<Record<string, unknown>> = [];
  const rowUpserts: Array<Record<string, unknown>> = [];

  const prisma = {
    importJob: {
      findUnique: async () => ({
        id: "job_1",
        companyId: "company_1",
        requestedById: "user_1",
        sourceFile: {
          id: "file_1",
          storageKey: "imports/vendors.csv",
          originalName: "vendors.csv"
        }
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        importJobUpdates.push(data);
        return { id: "job_1", ...data };
      }
    },
    importJobRow: {
      upsert: async ({ update }: { update: Record<string, unknown> }) => {
        rowUpserts.push(update);
        return update;
      }
    },
    vendor: {
      findUnique: async () => null,
      upsert: async ({ where, create }: { where: { companyId_code: { code: string } }; create: { name: string } }) => ({
        id: `vendor_${where.companyId_code.code}`,
        code: where.companyId_code.code,
        name: create.name
      })
    },
    auditLog: {
      create: async () => ({})
    }
  } as unknown as PrismaClient;

  const objectStorage = {
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
  };

  await processVendorImportJob({
    prismaClient: prisma,
    objectStorage,
    importJobId: "job_1",
    now: new Date("2026-03-15T00:00:00.000Z"),
    logger: {
      log: () => undefined,
      error: () => undefined
    }
  });

  const finalUpdate = importJobUpdates[importJobUpdates.length - 1] ?? {};
  assert.equal(finalUpdate.status, JobStatus.FAILED);
  assert.equal((finalUpdate.summaryJson as { failedRows?: number })?.failedRows, 1);
  assert.equal(rowUpserts.length, 2);
});

test("worker export job persists result file tracking and marks job SUCCEEDED", async () => {
  const putObjects: Array<{ key: string; body: Buffer }> = [];
  const exportUpdates: Array<Record<string, unknown>> = [];

  const prisma = {
    exportJob: {
      findUnique: async () => ({
        id: "export_1",
        companyId: "company_1",
        requestedById: "user_1",
        filterJson: {
          format: "CSV"
        }
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        exportUpdates.push(data);
        return { id: "export_1", ...data };
      }
    },
    expenseClaim: {
      findMany: async () => [
        {
          id: "claim_1",
          title: "택시비",
          status: "SUBMITTED",
          currency: "KRW",
          totalAmount: { toString: () => "15000" },
          createdAt: new Date("2026-03-14T00:00:00.000Z"),
          employee: {
            employeeNumber: "10000004",
            nameKr: "일반직원"
          },
          costCenter: null,
          project: null
        }
      ]
    },
    fileObject: {
      create: async () => ({
        id: "file_export_1",
        storageKey: "exports/file.csv",
        originalName: "expense-claims-export-2026-03-15.csv",
        sizeBytes: BigInt(12)
      })
    },
    auditLog: {
      create: async () => ({})
    }
  } as unknown as PrismaClient;

  const objectStorage = {
    async putObject(input: { key: string; body: Buffer }) {
      putObjects.push(input);
      return { key: input.key };
    },
    async getObject() {
      return {
        key: "unused",
        stream: Readable.from(Buffer.from("", "utf8"))
      };
    }
  };

  await processExpenseClaimExportJob({
    prismaClient: prisma,
    objectStorage,
    exportJobId: "export_1",
    now: new Date("2026-03-15T00:00:00.000Z"),
    logger: {
      log: () => undefined,
      error: () => undefined
    }
  });

  const finalUpdate = exportUpdates[exportUpdates.length - 1] ?? {};
  assert.equal(finalUpdate.status, JobStatus.SUCCEEDED);
  assert.equal(finalUpdate.resultFileId, "file_export_1");
  assert.equal(putObjects.length, 1);
});
