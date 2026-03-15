import assert from "node:assert/strict";
import test from "node:test";

import { normalizeIngestionPayload, resolveEdgeAgentKey, toIngressPayload } from "../src/ingestion";

test("resolveEdgeAgentKey reads string and array header values", () => {
  assert.equal(resolveEdgeAgentKey({ "x-edge-agent-key": "token-1" }), "token-1");
  assert.equal(resolveEdgeAgentKey({ "x-edge-agent-key": ["token-2"] }), "token-2");
  assert.equal(resolveEdgeAgentKey({}), undefined);
});

test("toIngressPayload normalizes provider/source and default company code", () => {
  const payload = toIngressPayload(
    {
      externalUserId: "ext-100",
      eventType: "IN",
      eventTimestamp: "2026-03-15T08:00:00.000Z"
    },
    "ACME_KR"
  );

  assert.equal(payload.companyCode, "ACME_KR");
  assert.equal(payload.provider, "GENERIC");
  assert.equal(payload.source, "AGENT_CSV");
  assert.equal(payload.event.externalUserId, "ext-100");
  assert.equal(payload.event.eventType, "IN");
});

test("normalizeIngestionPayload always returns event array", () => {
  const single = normalizeIngestionPayload({ externalUserId: "a" });
  const many = normalizeIngestionPayload([{ externalUserId: "a" }, { externalUserId: "b" }]);

  assert.equal(single.length, 1);
  assert.equal(many.length, 2);
});
