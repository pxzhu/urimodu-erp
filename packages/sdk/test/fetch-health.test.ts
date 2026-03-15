import assert from "node:assert/strict";
import test from "node:test";

import { fetchHealth } from "../src";

test("fetchHealth returns parsed health payload", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({
        status: "ok",
        service: "api",
        timestamp: "2026-03-15T00:00:00.000Z"
      })
    }) as Response) as typeof fetch;

  try {
    const result = await fetchHealth("http://localhost:4000");
    assert.equal(result.status, "ok");
    assert.equal(result.service, "api");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchHealth throws when HTTP response is not ok", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: false,
      status: 503
    }) as Response) as typeof fetch;

  try {
    await assert.rejects(async () => {
      await fetchHealth("http://localhost:4000");
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
