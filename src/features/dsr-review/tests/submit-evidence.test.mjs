import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(mocks) {
  const code = ts.transpileModule(readFileSync("src/features/dashboard/actions/dsr.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, Date, File, FormData, require(name) { assert.ok(name in mocks, name); return mocks[name]; } });
  return exports;
}

function actionHarness() {
  let saved = null;
  const api = load({
    "node:crypto": { randomUUID: () => "revision" },
    "@/features/dsr-review/validation": { parseGithubRepository: (url) => url ? { url } : null, validGithubUsername: () => true, validGithubBranch: () => true, workDateWindow: () => ({}) },
    "@/shared/lib/india-time": { formatIndiaDateKey: () => "2026-09-22" },
    mongoose: { isValidObjectId: () => false },
    "next/cache": { revalidatePath() {} },
    "@/features/auth/lib/auth-session": { getCurrentSession: async () => ({ user: { id: "employee", role: "EMPLOYEE", fullName: "Employee", projectIds: [], managerId: "" } }) },
    "@/database/mongodb/connect": { default: async () => {} },
    "@/features/notifications/service": { getAdminUserIds: async () => [], createNotificationsForUsers: async () => {} },
    "@/database/mongodb/models/daily-update": { DailyUpdateModel: { findOneAndUpdate: async (_filter, value) => { saved = value; } } },
    "@/database/mongodb/models/user": { UserModel: {} },
    "@/shared/storage/uploads/work-attachments": { saveDsrAttachments: async () => [{ name: "proof.png", url: "/proof.png" }] },
  });
  return { api, saved: () => saved };
}

function form() {
  const value = new FormData();
  value.set("summary", "Completed the dashboard work");
  value.set("accomplishments", "Implemented the approved dashboard task and verified it.");
  value.set("workDate", "2026-09-22");
  return value;
}

test("DSR rejects submission without GitHub evidence or a screenshot", async () => {
  const { api, saved } = actionHarness();
  const result = await api.submitDailyUpdate({}, form());
  assert.match(result.error, /GitHub repository evidence or upload at least one work screenshot/);
  assert.equal(saved(), null);
});

test("DSR accepts a screenshot-only non-code work report", async () => {
  const { api, saved } = actionHarness();
  const value = form();
  value.append("attachments", new File(["proof"], "proof.png", { type: "image/png" }));
  const result = await api.submitDailyUpdate({}, value);
  assert.equal(result.success, "Daily update saved.");
  assert.equal(saved().githubRepoUrl, "");
  assert.equal(saved().githubUsername, "");
});
