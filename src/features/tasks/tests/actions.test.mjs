import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(file, mocks) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, Date, File, console, require(name) { assert.ok(name in mocks, name); return mocks[name]; } });
  return exports;
}
const session = { user: { id: 'employee', role: 'EMPLOYEE' } };
const common = {
  'next/cache': { revalidatePath() {} },
  '@/features/auth/lib/auth-session': { getCurrentSession: async () => session },
  '@/database/mongodb/connect': { default: async () => {} },
  '@/shared/lib/india-time': { formatIndiaDateKey: () => '2026-09-22', formatIndiaTimeKey: () => '10:00' },
};
test('employee cannot forge task assignee or work date', async () => {
  let saved;
  const api = load('src/features/dashboard/actions/tasks.ts', {
    ...common,
    '@/features/notifications/service': { createNotificationsForUsers: async () => {} },
    '@/database/mongodb/models/notification': {},
    '@/database/mongodb/models/task': { TASK_DESCRIPTION_MAX_LENGTH: 5000, TASK_LABELS: [], TASK_PRIORITIES: ['MEDIUM'], TaskModel: { create: async value => { saved = value; return { _id: 'task' }; } } },
    '@/features/tasks/constants': { TASK_DESCRIPTION_MAX_LENGTH: 5000 },
    '@/database/mongodb/models/user': { UserModel: { findById: id => { assert.equal(id, 'employee'); return { lean: async () => ({ role: 'EMPLOYEE' }) }; } } },
    '@/shared/storage/uploads/work-attachments': { saveTaskAttachments: async () => [] },
    '@/features/tasks/deadline': { parseTaskDeadline: () => new Date(Date.now() + 86_400_000) },
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({ title: 'Review changes', description: `Review and verify the login flow. ${"x".repeat(3_900)}`, assignedUserId: 'another-employee', workDate: '2030-01-01', dueDate: '2026-09-23' })) form.set(key, value);
  assert.ok((await api.createTask({}, form)).success);
  assert.equal(saved.assignedUserId, 'employee');
  assert.equal(saved.assignedByUserId, 'employee');
  assert.equal(saved.workDate, '2026-09-22');
  assert.equal(saved.description.length > 1000, true);
});
test('direct attendance action rejects an incomplete daily plan before any attendance write', async () => {
  let writes = 0;
  const api = load('src/features/dashboard/actions/attendance.ts', {
    ...common,
    '@/features/tasks/server/daily-plan': { getDailyPlan: async (id, date) => { assert.equal(id, 'employee'); assert.equal(date, '2026-09-22'); return { ready: false, selfCount: 1 }; } },
    '@/database/mongodb/models/attendance': { AttendanceModel: { findOneAndUpdate: async () => { writes++; } } },
    '@/database/mongodb/models/workforce/user': {},
    '@/features/auth/lib/user-admin': {},
    '@/database/mongodb/models/setting': {},
  });
  const form = new FormData();
  form.set('workMode', 'WFH');
  form.set('ready', 'true');
  const result = await api.checkInAttendance(form);
  assert.match(result.error, /at least 2 self-created tasks/);
  assert.equal(writes, 0);
});
