import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("base tsconfig keeps strict mode enabled", async () => {
  const content = await readFile(new URL("../tsconfig/base.json", import.meta.url), "utf8");
  const parsed = JSON.parse(content);

  assert.equal(parsed?.compilerOptions?.strict, true);
  assert.equal(parsed?.compilerOptions?.target, "ES2022");
});
