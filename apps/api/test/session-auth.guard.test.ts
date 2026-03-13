import assert from "node:assert/strict";
import test from "node:test";

import { UnauthorizedException } from "@nestjs/common";

import { SessionAuthGuard } from "../src/common/guards/session-auth.guard";
import type { PrismaService } from "../src/common/prisma/prisma.service";

function createExecutionContext(headers: Record<string, string>) {
  const request = { headers };

  return {
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as never;
}

test("SessionAuthGuard sets auth context for valid session", async () => {
  const guard = new SessionAuthGuard({
    userSession: {
      findUnique: async () => ({
        id: "session_1",
        userId: "user_1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 10),
        user: {
          memberships: [
            {
              companyId: "company_1",
              role: "ORG_ADMIN",
              company: { name: "Acme Korea" }
            }
          ]
        }
      }),
      delete: async () => ({})
    }
  } as unknown as PrismaService);

  const context = createExecutionContext({
    authorization: "Bearer valid-token",
    "x-company-id": "company_1"
  });

  const result = await guard.canActivate(context);
  assert.equal(result, true);

  const request = context.switchToHttp().getRequest() as {
    auth?: { userId: string; companyId: string; role: string };
  };
  assert.equal(request.auth?.userId, "user_1");
  assert.equal(request.auth?.companyId, "company_1");
  assert.equal(request.auth?.role, "ORG_ADMIN");
});

test("SessionAuthGuard rejects requests without bearer token", async () => {
  const guard = new SessionAuthGuard({
    userSession: {
      findUnique: async () => null,
      delete: async () => ({})
    }
  } as unknown as PrismaService);

  await assert.rejects(
    async () => {
      await guard.canActivate(
        createExecutionContext({
          authorization: ""
        })
      );
    },
    (error: unknown) => {
      assert.equal(error instanceof UnauthorizedException, true);
      return true;
    }
  );
});

test("SessionAuthGuard rejects expired sessions and attempts cleanup", async () => {
  let deletedSessionId: string | null = null;

  const guard = new SessionAuthGuard({
    userSession: {
      findUnique: async () => ({
        id: "session_expired",
        userId: "user_1",
        expiresAt: new Date(Date.now() - 1000),
        user: {
          memberships: [
            {
              companyId: "company_1",
              role: "ORG_ADMIN",
              company: { name: "Acme Korea" }
            }
          ]
        }
      }),
      delete: async ({ where }: { where: { id: string } }) => {
        deletedSessionId = where.id;
        return {};
      }
    }
  } as unknown as PrismaService);

  await assert.rejects(
    async () => {
      await guard.canActivate(
        createExecutionContext({
          authorization: "Bearer expired-token",
          "x-company-id": "company_1"
        })
      );
    },
    (error: unknown) => {
      assert.equal(error instanceof UnauthorizedException, true);
      return true;
    }
  );

  assert.equal(deletedSessionId, "session_expired");
});

test("SessionAuthGuard rejects company context outside memberships", async () => {
  const guard = new SessionAuthGuard({
    userSession: {
      findUnique: async () => ({
        id: "session_1",
        userId: "user_1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 10),
        user: {
          memberships: [
            {
              companyId: "company_1",
              role: "ORG_ADMIN",
              company: { name: "Acme Korea" }
            }
          ]
        }
      }),
      delete: async () => ({})
    }
  } as unknown as PrismaService);

  await assert.rejects(
    async () => {
      await guard.canActivate(
        createExecutionContext({
          authorization: "Bearer valid-token",
          "x-company-id": "company_2"
        })
      );
    },
    (error: unknown) => {
      assert.equal(error instanceof UnauthorizedException, true);
      return true;
    }
  );
});
