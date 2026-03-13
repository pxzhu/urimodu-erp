import assert from "node:assert/strict";
import test from "node:test";

import { JournalEntryStatus, Prisma } from "@prisma/client";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { FinanceService } from "../src/modules/finance/services/finance.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";

test("FinanceService createJournalEntry creates balanced entry and logs audit", async () => {
  const auditLogs: Array<{ action: string }> = [];

  const prisma = {
    legalEntity: {
      findUnique: async () => null
    },
    expenseClaim: {
      findUnique: async () => null
    },
    account: {
      findMany: async () => [
        { id: "acc_cash", type: "ASSET", isPosting: true },
        { id: "acc_exp", type: "EXPENSE", isPosting: true }
      ]
    },
    vendor: {
      findMany: async () => []
    },
    costCenter: {
      findMany: async () => []
    },
    project: {
      findMany: async () => []
    },
    journalEntry: {
      findUnique: async ({ where }: { where: { companyId_number?: { companyId: string; number: string }; id?: string } }) => {
        if (where.id) {
          return {
            id: "je_1",
            companyId: "company_1",
            number: "JE-20260314-123456",
            entryDate: new Date("2026-03-14T00:00:00.000Z"),
            description: "택시비 정리",
            status: JournalEntryStatus.DRAFT,
            totalDebit: new Prisma.Decimal("10000"),
            totalCredit: new Prisma.Decimal("10000"),
            createdBy: {
              id: "user_1",
              name: "관리자",
              email: "admin@acme.local"
            },
            postedBy: null,
            expenseClaim: null,
            lines: [
              {
                id: "line_1",
                lineNo: 1,
                description: null,
                debit: new Prisma.Decimal("10000"),
                credit: new Prisma.Decimal("0"),
                account: { id: "acc_exp", code: "5300", name: "여비교통비", type: "EXPENSE" },
                vendor: null,
                costCenter: null,
                project: null
              },
              {
                id: "line_2",
                lineNo: 2,
                description: null,
                debit: new Prisma.Decimal("0"),
                credit: new Prisma.Decimal("10000"),
                account: { id: "acc_cash", code: "1100", name: "현금및현금성자산", type: "ASSET" },
                vendor: null,
                costCenter: null,
                project: null
              }
            ]
          };
        }

        return null;
      }
    },
    $transaction: async (
      callback: (transaction: {
        journalEntry: {
          create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
        };
      }) => Promise<Record<string, unknown>>
    ) => {
      return callback({
        journalEntry: {
          create: async ({ data }) => ({
            id: "je_1",
            ...data,
            number: "JE-20260314-123456",
            status: JournalEntryStatus.DRAFT,
            totalDebit: new Prisma.Decimal("10000"),
            totalCredit: new Prisma.Decimal("10000")
          })
        }
      });
    }
  } as unknown as PrismaService;

  const auditService = {
    async log(input: { action: string }) {
      auditLogs.push(input);
      return input;
    }
  } as unknown as AuditService;

  const service = new FinanceService(prisma, auditService);

  const result = await service.createJournalEntry(
    {
      userId: "user_1",
      sessionId: "session_1",
      companyId: "company_1",
      role: "HR_MANAGER",
      memberships: [{ companyId: "company_1", role: "HR_MANAGER", companyName: "Acme Korea" }],
      token: "token"
    },
    {
      entryDate: "2026-03-14",
      description: "택시비 정리",
      lines: [
        {
          accountId: "acc_exp",
          debit: 10000
        },
        {
          accountId: "acc_cash",
          credit: 10000
        }
      ]
    },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  assert.equal((result as { id?: string }).id, "je_1");
  assert.equal(auditLogs.some((entry) => entry.action === "JOURNAL_ENTRY_CREATE"), true);
});
