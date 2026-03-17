import assert from "node:assert/strict";
import test from "node:test";

import { ExpenseStatus, Prisma } from "@prisma/client";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { ExpensesService } from "../src/modules/expenses/services/expenses.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";

test("ExpensesService createClaim stores items and writes audit log", async () => {
  const auditLogs: Array<{ action: string }> = [];

  const prisma = {
    employee: {
      findFirst: async () => ({
        id: "emp_1",
        employeeNumber: "10000004",
        nameKr: "일반직원",
        legalEntityId: "le_1"
      })
    },
    $transaction: async (
      callback: (transaction: {
        expenseClaim: {
          create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
        };
        expenseItem: {
          createMany: (args: { data: Record<string, unknown>[] }) => Promise<{ count: number }>;
        };
      }) => Promise<Record<string, unknown>>
    ) => {
      return callback({
        expenseClaim: {
          create: async ({ data }) => ({
            id: "claim_1",
            ...data,
            companyId: "company_1",
            employeeId: "emp_1",
            status: ExpenseStatus.DRAFT,
            totalAmount: new Prisma.Decimal("16500")
          })
        },
        expenseItem: {
          createMany: async ({ data }) => ({ count: data.length })
        }
      });
    },
    expenseClaim: {
      findUnique: async () => ({
        id: "claim_1",
        companyId: "company_1",
        employeeId: "emp_1",
        title: "출장 택시비",
        status: ExpenseStatus.DRAFT,
        currency: "KRW",
        totalAmount: new Prisma.Decimal("16500"),
        createdAt: new Date("2026-03-14T00:00:00.000Z"),
        employee: {
          id: "emp_1",
          employeeNumber: "10000004",
          nameKr: "일반직원"
        },
        submittedBy: {
          id: "user_1",
          name: "일반직원",
          email: "employee@acme.local"
        },
        costCenter: null,
        project: null,
        document: null,
        items: [
          {
            id: "item_1",
            incurredOn: new Date("2026-03-14T00:00:00.000Z"),
            category: "TRANSPORT",
            description: "택시",
            amount: new Prisma.Decimal("15000"),
            vatAmount: new Prisma.Decimal("1500"),
            vendor: null,
            receiptFile: null
          }
        ],
        journalEntries: []
      })
    }
  } as unknown as PrismaService;

  const auditService = {
    async log(input: { action: string }) {
      auditLogs.push(input);
      return input;
    }
  } as unknown as AuditService;

  const service = new ExpensesService(prisma, auditService);

  const result = await service.createClaim(
    {
      userId: "user_1",
      sessionId: "session_1",
      companyId: "company_1",
      role: "EMPLOYEE",
      memberships: [{ companyId: "company_1", role: "EMPLOYEE", companyName: "Acme Korea" }],
      token: "token"
    },
    {
      title: "출장 택시비",
      currency: "krw",
      items: [
        {
          incurredOn: "2026-03-14",
          category: "TRANSPORT",
          amount: 15000,
          vatAmount: 1500,
          description: "택시"
        }
      ]
    },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  assert.equal((result as { id?: string }).id, "claim_1");
  assert.equal(auditLogs.some((entry) => entry.action === "EXPENSE_CLAIM_CREATE"), true);
});

test("ExpensesService createClaim rejects APPROVED status from non-admin client", async () => {
  const prisma = {} as PrismaService;
  const auditService = {
    async log() {
      return null;
    }
  } as unknown as AuditService;

  const service = new ExpensesService(prisma, auditService);

  await assert.rejects(
    () =>
      service.createClaim(
        {
          userId: "user_1",
          sessionId: "session_1",
          companyId: "company_1",
          role: "EMPLOYEE",
          memberships: [{ companyId: "company_1", role: "EMPLOYEE", companyName: "Acme Korea" }],
          token: "token"
        },
        {
          title: "종결 상태 우회 시도",
          status: ExpenseStatus.APPROVED,
          items: [
            {
              incurredOn: "2026-03-14",
              category: "MEAL",
              amount: 10000
            }
          ]
        },
        {}
      ),
    /server-managed/
  );
});

test("ExpensesService createClaim rejects POSTED status from non-admin client", async () => {
  const prisma = {} as PrismaService;
  const auditService = {
    async log() {
      return null;
    }
  } as unknown as AuditService;

  const service = new ExpensesService(prisma, auditService);

  await assert.rejects(
    () =>
      service.createClaim(
        {
          userId: "user_1",
          sessionId: "session_1",
          companyId: "company_1",
          role: "EMPLOYEE",
          memberships: [{ companyId: "company_1", role: "EMPLOYEE", companyName: "Acme Korea" }],
          token: "token"
        },
        {
          title: "전표 상태 우회 시도",
          status: ExpenseStatus.POSTED,
          items: [
            {
              incurredOn: "2026-03-14",
              category: "MEAL",
              amount: 12000
            }
          ]
        },
        {}
      ),
    /server-managed/
  );
});
