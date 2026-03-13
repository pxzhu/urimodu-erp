import assert from "node:assert/strict";
import test from "node:test";

import { ForbiddenException } from "@nestjs/common";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { OrgService } from "../src/modules/org/services/org.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";

test("OrgService builds department tree structure", async () => {
  const prisma = {
    department: {
      findMany: async () => [
        {
          id: "dep_root",
          companyId: "company_1",
          code: "ENG",
          name: "개발팀",
          parentId: null,
          managerEmployeeId: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          businessSiteId: null
        },
        {
          id: "dep_child",
          companyId: "company_1",
          code: "ENG-PLATFORM",
          name: "플랫폼개발팀",
          parentId: "dep_root",
          managerEmployeeId: null,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          businessSiteId: null
        }
      ]
    }
  } as unknown as PrismaService;

  const orgService = new OrgService(prisma, { log: async () => ({}) } as unknown as AuditService);

  const tree = (await orgService.listDepartmentTree(
    {
      userId: "user_1",
      sessionId: "session_1",
      companyId: "company_1",
      role: "ORG_ADMIN",
      memberships: [{ companyId: "company_1", role: "ORG_ADMIN", companyName: "Acme Korea" }],
      token: "token"
    },
    "company_1"
  )) as Array<{ id: string; children?: Array<{ id: string }> }>;

  assert.equal(tree.length, 1);
  assert.equal(tree[0]?.id, "dep_root");
  assert.equal(tree[0]?.children?.[0]?.id, "dep_child");
});

test("OrgService rejects unauthorized company access", async () => {
  const prisma = {} as PrismaService;
  const orgService = new OrgService(prisma, { log: async () => ({}) } as unknown as AuditService);

  await assert.rejects(
    async () => {
      await orgService.listDepartments(
        {
          userId: "user_1",
          sessionId: "session_1",
          companyId: "company_1",
          role: "EMPLOYEE",
          memberships: [{ companyId: "company_1", role: "EMPLOYEE", companyName: "Acme Korea" }],
          token: "token"
        },
        "company_2"
      );
    },
    (error: unknown) => {
      assert.equal(error instanceof ForbiddenException, true);
      return true;
    }
  );
});
