import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { ApprovalsService } from "../src/modules/approvals/services/approvals.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";

const approverAuth = {
  userId: "user_approver",
  sessionId: "session_1",
  companyId: "company_1",
  role: "APPROVER",
  memberships: [{ companyId: "company_1", role: "APPROVER", companyName: "Acme Korea" }],
  token: "token"
} as const;

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
  const result = (await service.listInbox(approverAuth)) as Array<{ id: string }>;

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "line_1");
});

test("ApprovalsService approve syncs linked leave and correction to APPROVED when final step completes", async () => {
  const auditLogs: Array<{ action: string }> = [];
  const syncedLeaveStatuses: string[] = [];
  const syncedCorrectionStatuses: string[] = [];

  const baseLine = {
    id: "line_approved",
    status: "IN_REVIEW",
    currentOrder: 1,
    submittedByEmployeeId: "emp_submitter",
    documentId: "doc_approved",
    document: {
      id: "doc_approved",
      companyId: "company_1",
      title: "휴가 신청서",
      status: "IN_REVIEW",
      currentVersionNo: 1
    },
    steps: [
      {
        id: "step_approve",
        orderNo: 1,
        status: "PENDING",
        type: "APPROVE",
        approverEmployeeId: "emp_approver",
        approverEmployee: {
          id: "emp_approver",
          userId: "user_approver",
          employeeNumber: "10000002",
          nameKr: "결재자"
        }
      }
    ],
    actions: []
  };

  const prisma = {
    employee: {
      findFirst: async () => ({ id: "emp_approver" })
    },
    approvalLine: {
      findUnique: async () => baseLine,
      update: async () => ({ id: "line_approved" })
    },
    approvalStep: {
      update: async () => ({ id: "step_approve" }),
      findMany: async () => baseLine.steps
    },
    document: {
      update: async () => ({ id: "doc_approved" })
    },
    approvalAction: {
      create: async () => ({ id: "action_1" })
    },
    leaveRequest: {
      findMany: async () => [{ id: "leave_1", status: "REQUESTED" }],
      update: async ({ data }: { data: { status: string } }) => {
        syncedLeaveStatuses.push(data.status);
        return { id: "leave_1", status: data.status };
      }
    },
    attendanceCorrection: {
      findMany: async () => [{ id: "corr_1", status: "REQUESTED" }],
      update: async ({ data }: { data: { status: string } }) => {
        syncedCorrectionStatuses.push(data.status);
        return { id: "corr_1", status: data.status };
      }
    }
  } as unknown as PrismaService;

  const auditService = {
    async log(input: { action: string }) {
      auditLogs.push(input);
      return input;
    }
  } as unknown as AuditService;

  const service = new ApprovalsService(prisma, auditService);

  await service.approve(
    approverAuth,
    "line_approved",
    { comment: "승인" },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  assert.deepEqual(syncedLeaveStatuses, ["APPROVED"]);
  assert.deepEqual(syncedCorrectionStatuses, ["APPROVED"]);
  assert.equal(auditLogs.some((entry) => entry.action === "LEAVE_REQUEST_STATUS_SYNC_FROM_APPROVAL"), true);
  assert.equal(auditLogs.some((entry) => entry.action === "ATTENDANCE_CORRECTION_STATUS_SYNC_FROM_APPROVAL"), true);
});

test("ApprovalsService reject syncs linked leave and correction to REJECTED", async () => {
  const syncedLeaveStatuses: string[] = [];
  const syncedCorrectionStatuses: string[] = [];

  const baseLine = {
    id: "line_rejected",
    status: "IN_REVIEW",
    currentOrder: 1,
    submittedByEmployeeId: "emp_submitter",
    documentId: "doc_rejected",
    document: {
      id: "doc_rejected",
      companyId: "company_1",
      title: "근태 정정 요청서",
      status: "IN_REVIEW",
      currentVersionNo: 1
    },
    steps: [
      {
        id: "step_reject",
        orderNo: 1,
        status: "PENDING",
        type: "APPROVE",
        approverEmployeeId: "emp_approver",
        approverEmployee: {
          id: "emp_approver",
          userId: "user_approver",
          employeeNumber: "10000002",
          nameKr: "결재자"
        }
      }
    ],
    actions: []
  };

  const prisma = {
    employee: {
      findFirst: async () => ({ id: "emp_approver" })
    },
    approvalLine: {
      findUnique: async () => baseLine,
      update: async () => ({ id: "line_rejected" })
    },
    approvalStep: {
      update: async () => ({ id: "step_reject" })
    },
    document: {
      update: async () => ({ id: "doc_rejected" })
    },
    approvalAction: {
      create: async () => ({ id: "action_2" })
    },
    leaveRequest: {
      findMany: async () => [{ id: "leave_2", status: "REQUESTED" }],
      update: async ({ data }: { data: { status: string } }) => {
        syncedLeaveStatuses.push(data.status);
        return { id: "leave_2", status: data.status };
      }
    },
    attendanceCorrection: {
      findMany: async () => [{ id: "corr_2", status: "REQUESTED" }],
      update: async ({ data }: { data: { status: string } }) => {
        syncedCorrectionStatuses.push(data.status);
        return { id: "corr_2", status: data.status };
      }
    }
  } as unknown as PrismaService;

  const service = new ApprovalsService(prisma, { log: async () => ({}) } as unknown as AuditService);

  await service.reject(
    approverAuth,
    "line_rejected",
    { comment: "반려" },
    {
      ipAddress: "127.0.0.1",
      userAgent: "node-test"
    }
  );

  assert.deepEqual(syncedLeaveStatuses, ["REJECTED"]);
  assert.deepEqual(syncedCorrectionStatuses, ["REJECTED"]);
});
