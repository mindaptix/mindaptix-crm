import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./commitment-deductions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

test("only confirmed unfinished tasks generate one deduction, even across repeated runs", async () => {
  const entries = [
    { taskId: "late", userId: "a", answer: "YES", friday: "2026-10-30", promisedDate: "2026-10-28" },
    { taskId: "late", userId: "a", answer: "YES", friday: "2026-10-30", promisedDate: "2026-10-29" },
    { taskId: "no", userId: "a", answer: "NO", friday: "2026-10-30", promisedDate: "" },
    { taskId: "done", userId: "a", answer: "YES", friday: "2026-10-30", promisedDate: "2026-10-28" },
    { taskId: "paid", userId: "b", answer: "YES", friday: "2026-10-30", promisedDate: "2026-10-28" },
  ];
  const stored = new Map();
  const tasks = { late: { title: "Late task", assignedUserId: "a", status: "PENDING", updatedAt: new Date("2026-10-30T10:00:00Z") }, done: { title: "Done", assignedUserId: "a", status: "COMPLETED", completedAt: new Date("2026-10-30T10:00:00Z") }, paid: { title: "Paid", assignedUserId: "b", status: "PENDING", updatedAt: new Date("2026-10-30T10:00:00Z") } };
  const mocks = {
    "server-only": {},
    "@/database/mongodb/connect": { default: async () => {} },
    "@/database/mongodb/models/operations/task-commitment": { TaskCommitmentModel: { find: (query) => ({ sort: () => ({ lean: async () => entries.filter((entry) => entry.answer === query.answer && entry.friday < query.friday.$lt) }) }) } },
    "@/database/mongodb/models/task": { TaskModel: { findById: (id) => ({ lean: async () => tasks[id] }) } },
    "@/database/mongodb/models/workforce/salary-adjustment": { SalaryAdjustmentModel: { init: async () => {}, updateOne: async ({ sourceKey }, update) => { if (stored.has(sourceKey)) return { upsertedCount: 0 }; stored.set(sourceKey, update.$setOnInsert); return { upsertedCount: 1 }; } } },
    "@/database/mongodb/models/workforce/payslip": { PayslipModel: { exists: async ({ userId }) => userId === "b", updateOne: async () => {} } },
    "@/shared/lib/india-time": { formatIndiaDateKey: () => "2026-10-31" },
    "@/features/tasks/commitment-policy": { fridayEndInstant: () => new Date("2026-10-30T18:30:00Z"), shouldDeductForCommitment: (task, cutoff) => task.status === "PENDING" ? task.updatedAt < cutoff : Boolean(task.completedAt && task.completedAt >= cutoff) },
  };
  const testModule = { exports: {} };
  vm.runInNewContext(compiled, { module: testModule, exports: testModule.exports, require: (name) => { if (!(name in mocks)) throw new Error(name); return mocks[name]; }, Date });
  const first = await testModule.exports.applyCommitmentDeductions(new Date("2026-10-30T18:30:00Z"));
  const second = await testModule.exports.applyCommitmentDeductions(new Date("2026-10-31T18:30:00Z"));
  assert.equal(first.added, 1);
  assert.equal(second.added, 0);
  assert.equal(stored.size, 1);
  assert.equal(stored.get("commitment-missed:late").amount, 200);
  assert.match(stored.get("commitment-missed:late").reason, /2026-10-30/);
});
