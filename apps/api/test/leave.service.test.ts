import assert from "node:assert/strict";
import test from "node:test";

import { LeaveUnit, Prisma } from "@prisma/client";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { LeaveService } from "../src/modules/leave/services/leave.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";
import type { DocumentsService } from "../src/modules/documents/services/documents.service";
import type { ApprovalsService } from "../src/modules/approvals/services/approvals.service";

test("LeaveService createLeaveRequest creates document and approval line when approvers are provided", async () => {
  let capturedCreateData: Record<string, unknown> | undefined;
  let configureCalled = false;
  let submitCalled = false;

  const prisma = {
    employee: {
      findFirst: async () => ({
        id: "emp_1",
        companyId: "company_1",
        employeeNumber: "10000004",
        nameKr: "일반직원"
      })
    },
    leavePolicy: {
      findUnique: async () => ({
        id: "policy_1",
        companyId: "company_1",
        name: "연차",
        unit: LeaveUnit.DAY
      })
    },
    documentTemplate: {
      findFirst: async () => ({
        id: "template_1"
      })
    },
    leaveRequest: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        capturedCreateData = data;
        return {
          id: "leave_1",
          status: "REQUESTED",
          startDate: new Date("2026-03-18"),
          endDate: new Date("2026-03-18"),
          unit: LeaveUnit.DAY,
          quantity: new Prisma.Decimal("1"),
          reason: "가족 행사",
          employee: {
            id: "emp_1",
            employeeNumber: "10000004",
            nameKr: "일반직원"
          },
          leavePolicy: {
            id: "policy_1",
            code: "ANNUAL",
            name: "연차",
            unit: LeaveUnit.DAY
          },
          document: {
            id: "doc_1",
            title: "휴가 신청서",
            status: "IN_REVIEW",
            currentVersionNo: 1
          }
        };
      }
    }
  } as unknown as PrismaService;

  const auditLogs: Array<{ action: string; [key: string]: unknown }> = [];
  const auditService = {
    async log(input: { action: string; [key: string]: unknown }) {
      auditLogs.push(input);
      return input;
    }
  } as unknown as AuditService;

  const documentsService = {
    async createDocument() {
      return {
        id: "doc_1"
      };
    }
  } as unknown as DocumentsService;

  const approvalsService = {
    async configureLine() {
      configureCalled = true;
      return {
        id: "line_1"
      };
    },
    async submit() {
      submitCalled = true;
      return {
        id: "line_1",
        status: "IN_REVIEW"
      };
    }
  } as unknown as ApprovalsService;

  const service = new LeaveService(prisma, auditService, documentsService, approvalsService);

  const result = await service.createLeaveRequest(
    {
      userId: "user_1",
      sessionId: "session_1",
      companyId: "company_1",
      role: "EMPLOYEE",
      memberships: [{ companyId: "company_1", role: "EMPLOYEE", companyName: "Acme Korea" }],
      token: "token"
    },
    {
      leavePolicyId: "policy_1",
      startDate: "2026-03-18",
      endDate: "2026-03-18",
      unit: LeaveUnit.DAY,
      reason: "가족 행사",
      approverEmployeeIds: ["emp_approver"],
      autoCreateDocument: true
    },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  assert.equal(capturedCreateData?.documentId, "doc_1");
  assert.equal(configureCalled, true);
  assert.equal(submitCalled, true);
  assert.equal((result as { id?: string }).id, "leave_1");
  assert.equal(auditLogs.some((entry) => entry.action === "LEAVE_REQUEST_CREATE"), true);
});
