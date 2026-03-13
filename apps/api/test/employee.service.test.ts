import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { EmployeeService } from "../src/modules/employee/services/employee.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";

test("EmployeeService createEmployee returns masked fields and logs audit", async () => {
  const logs: Array<{ action: string }> = [];

  const prisma = {
    employee: {
      create: async () => ({
        id: "emp_1",
        companyId: "company_1",
        employeeNumber: "10000009",
        nameKr: "테스트직원",
        nameEn: null,
        workEmail: "tester@acme.local",
        mobilePhone: "010-1234-5678",
        nationalIdMasked: "900101-1234567",
        hireDate: new Date("2025-01-01"),
        terminationDate: null,
        employmentType: "FULL_TIME",
        employmentStatus: "ACTIVE",
        department: { id: "dep_1", name: "개발팀" },
        position: { id: "pos_1", name: "사원" },
        jobTitle: { id: "title_1", name: "팀원" }
      })
    }
  } as unknown as PrismaService;

  const employeeService = new EmployeeService(prisma, {
    async log(input: { action: string }) {
      logs.push({ action: input.action });
      return input;
    }
  } as unknown as AuditService);

  const result = await employeeService.createEmployee(
    {
      userId: "user_1",
      sessionId: "session_1",
      companyId: "company_1",
      role: "HR_MANAGER",
      memberships: [{ companyId: "company_1", role: "HR_MANAGER", companyName: "Acme Korea" }],
      token: "token"
    },
    {
      companyId: "company_1",
      employeeNumber: "10000009",
      nameKr: "테스트직원",
      workEmail: "tester@acme.local",
      hireDate: "2025-01-01",
      employmentType: "FULL_TIME"
    },
    { ipAddress: "127.0.0.1", userAgent: "node-test" }
  );

  assert.equal(result.workEmail, "te****@acme.local");
  assert.equal(result.mobilePhone, "010-****-5678");
  assert.equal(result.nationalIdMasked, "900101-1******");
  assert.equal(logs.some((entry) => entry.action === "EMPLOYEE_CREATE"), true);
});
