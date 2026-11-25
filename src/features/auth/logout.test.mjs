import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("logout requires closure or explicit salary forfeiture, once per day", async () => {
  let role = "EMPLOYEE", outstanding = 2, cleared = 0;
  const deductions = new Map();
  const mocks = {
    "next/navigation": { redirect: () => { throw new Error("REDIRECT"); } },
    "@/database/mongodb/connect": { default: async () => {} },
    "@/features/auth/lib/auth-session": { getCurrentSession: async () => ({ user: { id: "employee", role } }), clearCurrentSession: async () => { cleared++; } },
    "@/shared/lib/india-time": { formatIndiaDateKey: () => "2026-11-25" },
    "@/database/mongodb/models/task": { TaskModel: { countDocuments: async (filter) => { assert.equal(filter.assignedUserId, "employee"); assert.equal(filter.assignedByUserId, undefined); assert.equal(filter.dueDate.$lte, "2026-11-25"); assert.deepEqual(Array.from(filter.status.$nin), ["CLOSED", "FAILED"]); return outstanding; } } },
    "@/database/mongodb/models/workforce/salary": { SalaryModel: { findOne: () => ({ sort: () => ({ lean: async () => ({ basicSalary: 18000, hra: 0, transportAllowance: 0, medicalAllowance: 0, otherAllowances: 0 }) }) }) } },
    "@/database/mongodb/models/workforce/payslip": { PayslipModel: { exists: async () => false, updateOne: async () => {} } },
    "@/database/mongodb/models/workforce/salary-adjustment": { SalaryAdjustmentModel: { init: async () => {}, updateOne: async ({ sourceKey }, update) => { if (!deductions.has(sourceKey)) deductions.set(sourceKey, update.$setOnInsert); } } },
  };
  const mod = { exports: {} };
  const source = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: mod, exports: mod.exports, require: (name) => mocks[name] ?? {}, FormData, Date });
  assert.match((await mod.exports.requestLogout({}, new FormData())).error, /Super Admin/);
  assert.equal(cleared, 0);
  assert.equal(deductions.size, 0);
  const confirmed = new FormData(); confirmed.set("logoutAnyway", "confirmed");
  for (let i = 0; i < 2; i++) await assert.rejects(mod.exports.requestLogout({}, confirmed), /REDIRECT/);
  assert.equal(deductions.size, 1);
  assert.equal([...deductions.values()][0].amount, 600);
  outstanding = 0;
  await assert.rejects(mod.exports.requestLogout({}, new FormData()), /REDIRECT/);
  role = "SUPER_ADMIN"; outstanding = 2;
  await assert.rejects(mod.exports.requestLogout({}, new FormData()), /REDIRECT/);
  assert.equal(deductions.size, 1);
});
