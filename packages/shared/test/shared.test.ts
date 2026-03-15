import assert from "node:assert/strict";
import test from "node:test";

import { APP_NAME, toIsoDate } from "../src";

test("toIsoDate formats date to YYYY-MM-DD", () => {
  assert.equal(toIsoDate(new Date("2026-03-15T13:04:00.000Z")), "2026-03-15");
});

test("APP_NAME is defined", () => {
  assert.equal(typeof APP_NAME, "string");
  assert.equal(APP_NAME.length > 0, true);
});
