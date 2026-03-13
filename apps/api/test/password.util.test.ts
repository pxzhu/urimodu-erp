import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "../src/common/auth/password.util";

test("hashPassword returns encoded pbkdf2 format", () => {
  const hash = hashPassword("ChangeMe123!");
  assert.match(hash, /^pbkdf2\$\d+\$[a-f0-9]+\$[a-f0-9]+$/);
});

test("verifyPassword succeeds for correct password and fails otherwise", () => {
  const hash = hashPassword("ChangeMe123!");
  assert.equal(verifyPassword("ChangeMe123!", hash), true);
  assert.equal(verifyPassword("WrongPassword!", hash), false);
});

test("verifyPassword fails for malformed hash strings", () => {
  assert.equal(verifyPassword("ChangeMe123!", "invalid-hash"), false);
});
