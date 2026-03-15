import assert from "node:assert/strict";
import test from "node:test";

import { statusBadgeClass } from "../src";

test("statusBadgeClass returns expected class names", () => {
  assert.equal(statusBadgeClass("ok"), "badge badge-ok");
  assert.equal(statusBadgeClass("warn"), "badge badge-warn");
  assert.equal(statusBadgeClass("error"), "badge badge-error");
});
