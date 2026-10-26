import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../lib/work-calendar.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, { module: testModule, exports: testModule.exports, require: createRequire(import.meta.url), Date, Set });
const { COMPANY_HOLIDAYS_2026, currentPolicyHolidays, getWorkdayBreakdown } = testModule.exports;

test("the current 2026 holiday calendar contains only Diwali", () => {
  const current = currentPolicyHolidays(COMPANY_HOLIDAYS_2026);
  assert.equal(current.length, 1);
  assert.equal(current[0].name, "Diwali");
  assert.equal(current[0].date, "2026-11-08");
});

test("historical holidays remain in payroll calculations and weekends remain off", () => {
  const dates = COMPANY_HOLIDAYS_2026.map((holiday) => holiday.date);
  const past = getWorkdayBreakdown("2026-10-02", "2026-10-02", dates);
  assert.equal(past.holidayDays, 1);
  const today = getWorkdayBreakdown("2026-10-26", "2026-10-26", dates);
  assert.equal(today.workingDays, 1);
  const diwali = getWorkdayBreakdown("2026-11-08", "2026-11-08", dates);
  assert.equal(diwali.weekendDays, 1);
  assert.equal(diwali.workingDays, 0);
});
