import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./commitment-policy.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, { module: testModule, exports: testModule.exports, Date });
const { fridayOfWeek, fridayEndInstant, shouldDeductForCommitment } = testModule.exports;

test("commitment week ends Friday midnight in India, including across months", () => {
  assert.equal(fridayOfWeek("2026-10-26"), "2026-10-30");
  assert.equal(fridayOfWeek("2026-12-28"), "2027-01-01");
  assert.equal(fridayEndInstant("2026-10-30").toISOString(), "2026-10-30T18:30:00.000Z");
});

test("only tasks shown incomplete at the Friday cutoff qualify", () => {
  const cutoff = fridayEndInstant("2026-10-30");
  assert.equal(shouldDeductForCommitment({ status: "COMPLETED", completedAt: new Date("2026-10-30T18:29:59Z") }, cutoff), false);
  assert.equal(shouldDeductForCommitment({ status: "COMPLETED", completedAt: new Date("2026-10-30T18:30:00Z") }, cutoff), true);
  assert.equal(shouldDeductForCommitment({ status: "PENDING", updatedAt: new Date("2026-10-30T12:00:00Z") }, cutoff), true);
  assert.equal(shouldDeductForCommitment({ status: "PENDING", updatedAt: new Date("2026-10-31T00:00:00Z") }, cutoff), false);
  assert.equal(shouldDeductForCommitment({ status: "CLOSED", completedAt: null }, cutoff), false);
});
