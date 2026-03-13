import assert from "node:assert/strict";
import test from "node:test";

import { UnauthorizedException } from "@nestjs/common";

import { hashPassword } from "../src/common/auth/password.util";
import type { PrismaService } from "../src/common/prisma/prisma.service";
import { AuthService } from "../src/modules/auth/services/auth.service";
import { LocalAuthProvider } from "../src/modules/auth/providers/local-auth.provider";
import { OidcAuthProvider } from "../src/modules/auth/providers/oidc-auth.provider";
import type { AuditService } from "../src/modules/audit/services/audit.service";

function createMockAuditService() {
  const logs: Array<{ action: string; [key: string]: unknown }> = [];
  return {
    logs,
    service: {
      async log(input: { action: string; [key: string]: unknown }) {
        logs.push(input);
        return input;
      }
    } as unknown as AuditService
  };
}

test("AuthService login succeeds and writes success audit log", async () => {
  const passwordHash = hashPassword("ChangeMe123!");

  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => {
        if (where.email !== "admin@acme.local") {
          return null;
        }

        return {
          id: "user_1",
          email: "admin@acme.local",
          name: "관리자",
          credentials: { passwordHash }
        };
      }
    },
    companyMembership: {
      findMany: async () => [
        {
          companyId: "company_1",
          role: "SUPER_ADMIN",
          company: { name: "Acme Korea" }
        }
      ]
    },
    userSession: {
      create: async ({ data }: { data: { userId: string } }) => ({
        id: "session_1",
        userId: data.userId
      })
    }
  } as unknown as PrismaService;

  const audit = createMockAuditService();
  const authService = new AuthService(
    prisma,
    audit.service,
    new LocalAuthProvider(prisma),
    new OidcAuthProvider()
  );

  const result = await authService.login({
    email: "admin@acme.local",
    password: "ChangeMe123!",
    provider: "local"
  });

  assert.equal(result.user.email, "admin@acme.local");
  assert.equal(result.defaultCompanyId, "company_1");
  assert.equal(typeof result.token, "string");
  assert.equal(result.memberships.length, 1);
  assert.equal(audit.logs.some((entry) => entry.action === "AUTH_LOGIN_SUCCESS"), true);
});

test("AuthService login failure raises UnauthorizedException and writes failure audit", async () => {
  const prisma = {
    user: {
      findUnique: async () => null
    }
  } as unknown as PrismaService;

  const audit = createMockAuditService();
  const authService = new AuthService(
    prisma,
    audit.service,
    new LocalAuthProvider(prisma),
    new OidcAuthProvider()
  );

  await assert.rejects(
    async () => {
      await authService.login({
        email: "missing@acme.local",
        password: "ChangeMe123!",
        provider: "local"
      });
    },
    (error: unknown) => {
      assert.equal(error instanceof UnauthorizedException, true);
      return true;
    }
  );

  assert.equal(audit.logs.some((entry) => entry.action === "AUTH_LOGIN_FAILED"), true);
});
