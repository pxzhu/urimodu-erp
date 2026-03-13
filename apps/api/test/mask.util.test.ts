import assert from "node:assert/strict";
import test from "node:test";

import { maskEmail, maskNationalId, maskPhone } from "../src/common/utils/mask.util";

test("maskEmail masks local part while keeping domain", () => {
  assert.equal(maskEmail("admin@acme.local"), "ad***@acme.local");
  assert.equal(maskEmail("a@acme.local"), "a*@acme.local");
  assert.equal(maskEmail(null), null);
});

test("maskPhone masks middle section", () => {
  assert.equal(maskPhone("010-1234-5678"), "010-****-5678");
  assert.equal(maskPhone("12345"), "***");
  assert.equal(maskPhone(undefined), null);
});

test("maskNationalId keeps birth segment and masks tail", () => {
  assert.equal(maskNationalId("900101-1234567"), "900101-1******");
  assert.equal(maskNationalId("123"), "******-*******");
  assert.equal(maskNationalId(undefined), null);
});
