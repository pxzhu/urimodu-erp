import assert from "node:assert/strict";
import test from "node:test";

import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RolesGuard } from "../src/common/guards/roles.guard";

function createExecutionContext(auth: unknown) {
  return {
    getHandler: () => "handler",
    getClass: () => "class",
    switchToHttp: () => ({
      getRequest: () => ({ auth })
    })
  } as never;
}

test("RolesGuard allows access when role is in required set", () => {
  const reflector = {
    getAllAndOverride: () => ["ORG_ADMIN"]
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);
  const result = guard.canActivate(
    createExecutionContext({
      role: "ORG_ADMIN"
    })
  );

  assert.equal(result, true);
});

test("RolesGuard denies access when role is missing", () => {
  const reflector = {
    getAllAndOverride: () => ["SUPER_ADMIN"]
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  assert.throws(
    () => {
      guard.canActivate(
        createExecutionContext({
          role: "EMPLOYEE"
        })
      );
    },
    (error: unknown) => {
      assert.equal(error instanceof ForbiddenException, true);
      return true;
    }
  );
});

test("RolesGuard skips role check when endpoint has no role metadata", () => {
  const reflector = {
    getAllAndOverride: () => undefined
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  const result = guard.canActivate(createExecutionContext(undefined));
  assert.equal(result, true);
});
