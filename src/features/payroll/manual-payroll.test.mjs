import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./manual-payroll.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, { module: testModule, exports: testModule.exports });
const { calculateManualPayroll } = testModule.exports;

test("manual deductions and fixed deductions reduce salary, while rewards increase it", () => {
  const result = calculateManualPayroll(18000, 200, 500, 1000);
  assert.equal(result.totalDeductions, 700);
  assert.equal(result.netSalary, 18300);
});

test("payable salary never goes below zero", () => {
  assert.equal(calculateManualPayroll(100, 0, 500, 0).netSalary, 0);
});
