import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function loadConfig() {
  const source = readFileSync("src/features/dashboard/config.ts", "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require() { throw new Error("Unexpected runtime dependency"); } });
  return exports;
}

test("employee navigation contains only personal work and self-service areas", () => {
  const { getDashboardNavItemsForRole } = loadConfig();
  const keys = getDashboardNavItemsForRole("EMPLOYEE").map((item) => item.key);

  assert.deepEqual([...keys], [
    "dashboard", "attendance", "leaves", "tasks", "dsr", "payroll", "expenses",
    "regularize", "documents", "announcements", "settings",
  ]);
  for (const key of ["employees", "projects", "portfolio", "reports", "payments", "assets", "alldocs"]) {
    assert.equal(keys.includes(key), false, `${key} must not be available to employees`);
  }
});
