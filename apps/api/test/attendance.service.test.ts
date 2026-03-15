import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { AttendanceService } from "../src/modules/attendance/services/attendance.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";

test("AttendanceService createShiftPolicy auto-increments version for same code", async () => {
  const auditLogs: Array<{ action: string; [key: string]: unknown }> = [];

  const prisma = {
    shiftPolicy: {
      findFirst: async () => ({ version: 2 }),
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "policy_3",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    },
    $transaction: async (
      callback: (transaction: {
        shiftPolicy: {
          updateMany: (args: unknown) => Promise<unknown>;
          create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
        };
      }) => Promise<Record<string, unknown>>
    ) => {
      return callback({
        shiftPolicy: {
          updateMany: async () => ({ count: 1 }),
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            id: "policy_3",
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      });
    }
  } as unknown as PrismaService;

  const auditService = {
    async log(input: { action: string; [key: string]: unknown }) {
      auditLogs.push(input);
      return input;
    }
  } as unknown as AuditService;

  const service = new AttendanceService(prisma, auditService);

  const result = await service.createShiftPolicy(
    {
      userId: "user_1",
      sessionId: "session_1",
      companyId: "company_1",
      role: "HR_MANAGER",
      memberships: [{ companyId: "company_1", role: "HR_MANAGER", companyName: "Acme Korea" }],
      token: "token"
    },
    {
      code: "DEFAULT_9_TO_6",
      name: "기본 09:00~18:00",
      workStartMinutes: 540,
      workEndMinutes: 1080,
      breakMinutes: 60,
      graceMinutes: 10,
      isDefault: true
    },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  assert.equal((result as { version?: number }).version, 3);
  assert.equal(auditLogs.some((entry) => entry.action === "SHIFT_POLICY_CREATE"), true);
});

test("AttendanceService createShiftPolicy accepts overnight shift configuration", async () => {
  const prisma = {
    shiftPolicy: {
      findFirst: async () => null
    },
    $transaction: async (
      callback: (transaction: {
        shiftPolicy: {
          updateMany: (args: unknown) => Promise<unknown>;
          create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
        };
      }) => Promise<Record<string, unknown>>
    ) => {
      return callback({
        shiftPolicy: {
          updateMany: async () => ({ count: 0 }),
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            id: "policy_night",
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      });
    }
  } as unknown as PrismaService;

  const service = new AttendanceService(prisma, { log: async () => ({}) } as unknown as AuditService);

  const result = await service.createShiftPolicy(
    {
      userId: "user_1",
      sessionId: "session_1",
      companyId: "company_1",
      role: "HR_MANAGER",
      memberships: [{ companyId: "company_1", role: "HR_MANAGER", companyName: "Acme Korea" }],
      token: "token"
    },
    {
      code: "NIGHT_22_06",
      name: "야간 22:00~06:00",
      workStartMinutes: 1320,
      workEndMinutes: 360,
      breakMinutes: 60,
      graceMinutes: 10,
      isDefault: false
    },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  assert.equal((result as { code?: string }).code, "NIGHT_22_06");
  assert.equal((result as { workStartMinutes?: number }).workStartMinutes, 1320);
  assert.equal((result as { workEndMinutes?: number }).workEndMinutes, 360);
});
