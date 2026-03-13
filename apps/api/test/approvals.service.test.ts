import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { ApprovalsService } from "../src/modules/approvals/services/approvals.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";

test("ApprovalsService listInbox returns only current user's actionable lines", async () => {
  const prisma = {
    employee: {
      findFirst: async () => ({ id: "emp_approver" })
    },
    approvalLine: {
      findMany: async () => [
        {
          id: "line_1",
          status: "IN_REVIEW",
          currentOrder: 1,
          submittedAt: new Date(),
          document: {
            id: "doc_1",
            companyId: "company_1",
            title: "휴가 신청서",
            status: "IN_REVIEW",
            currentVersionNo: 1
          },
          steps: [
            {
              id: "step_1",
              orderNo: 1,
              status: "PENDING",
              approverEmployeeId: "emp_approver",
              approverEmployee: {
                id: "emp_approver",
                employeeNumber: "10000002",
                nameKr: "인사담당자",
                userId: "user_approver"
              }
            }
          ]
        },
        {
          id: "line_2",
          status: "IN_REVIEW",
          currentOrder: 2,
          submittedAt: new Date(),
          document: {
            id: "doc_2",
            companyId: "company_1",
            title: "경비 승인 요청서",
            status: "IN_REVIEW",
            currentVersionNo: 1
          },
          steps: [
            {
              id: "step_2",
              orderNo: 2,
              status: "PENDING",
              approverEmployeeId: "emp_other",
              approverEmployee: {
                id: "emp_other",
                employeeNumber: "10000008",
                nameKr: "타부서 결재자",
                userId: "user_other"
              }
            }
          ]
        }
      ]
    }
  } as unknown as PrismaService;

  const service = new ApprovalsService(prisma, { log: async () => ({}) } as unknown as AuditService);
  const result = (await service.listInbox({
    userId: "user_approver",
    sessionId: "session_1",
    companyId: "company_1",
    role: "APPROVER",
    memberships: [{ companyId: "company_1", role: "APPROVER", companyName: "Acme Korea" }],
    token: "token"
  })) as Array<{ id: string }>;

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "line_1");
});
