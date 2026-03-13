import assert from "node:assert/strict";
import test from "node:test";

import { getHeaderValue } from "../src/common/utils/request.util";

test("getHeaderValue extracts first usable value", () => {
  assert.equal(getHeaderValue("single"), "single");
  assert.equal(getHeaderValue(["first", "second"]), "first");
  assert.equal(getHeaderValue(undefined), undefined);
});
