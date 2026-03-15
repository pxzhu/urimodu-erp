import assert from "node:assert/strict";
import test from "node:test";

import type { HealthResponse } from "../src";

test("HealthResponse contract shape remains stable", () => {
  const payload: HealthResponse = {
    status: "ok",
    service: "api",
    timestamp: "2026-03-15T00:00:00.000Z"
  };

  assert.equal(payload.status, "ok");
  assert.equal(typeof payload.service, "string");
  assert.equal(typeof payload.timestamp, "string");
});
