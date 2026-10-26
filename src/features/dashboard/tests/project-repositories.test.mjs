import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("repository additions require an assigned employee and validate the URL", async () => {
  let session = null;
  let filter;
  const modules = {
    mongoose: { default: { isValidObjectId: (id) => id === "project" } },
    "next/cache": { revalidatePath() {} },
    "@/database/mongodb/connect": { default: async () => {} },
    "@/database/mongodb/models/project": { ProjectModel: { updateOne: async (query) => { filter = query; return { matchedCount: 1, modifiedCount: 1 }; } } },
    "@/features/auth/lib/auth-session": { getCurrentSession: async () => session },
    "@/features/dsr-review/validation": { parseGithubRepository: (url) => url === "https://github.com/team/app" ? { url } : null },
  };
  const code = ts.transpileModule(readFileSync("src/features/dashboard/actions/project-repositories.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (name) => modules[name] });
  const form = (url) => ({ get: (name) => name === "projectId" ? "project" : url });
  assert.ok((await exports.addProjectRepository({}, form("https://github.com/team/app"))).error);
  session = { user: { id: "employee-1", role: "EMPLOYEE" } };
  assert.ok((await exports.addProjectRepository({}, form("https://evil.example/repo"))).error);
  assert.ok((await exports.addProjectRepository({}, form("https://github.com/team/app"))).success);
  assert.equal(filter.assignedUserIds, "employee-1");
  assert.equal(filter.archivedAt, null);
});
