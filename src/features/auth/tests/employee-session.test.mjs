import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';

function load(file, mocks) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, Date, process: { env: { SESSION_SECRET: 'test-secret-that-is-at-least-32-characters' } }, require(name) { assert.ok(name in mocks, name); return mocks[name]; } });
  return exports;
}
const admin = { _id: 'owner', role: 'SUPER_ADMIN', status: 'ACTIVE', fullName: 'Admin', email: 'admin@example.test' };
const employee = { _id: 'employee', role: 'EMPLOYEE', status: 'ACTIVE', fullName: 'Employee', email: 'employee@example.test' };
function sessionModule({ owner = admin, target = employee, until = new Date(Date.now() + 60_000) } = {}) {
  return load('src/features/auth/lib/auth-session.ts', {
    'node:crypto': crypto, react: { cache: fn => fn }, 'next/headers': { cookies: async () => ({ get: () => ({ value: 'test-token' }) }) },
    '@/database/mongodb/connect': { default: async () => {} }, '@/features/auth/lib/rbac': { normalizeActor: value => value },
    '@/database/mongodb/models/user-session': { UserSessionModel: { findOne: () => ({ lean: async () => ({ _id: 'session', userId: 'owner', impersonatedUserId: 'employee', impersonationExpiresAt: until }) }) } },
    '@/database/mongodb/models/user': { UserModel: { findById: () => ({ lean: async () => owner }), findOne: query => ({ lean: async () => { assert.equal(query.role, 'EMPLOYEE'); assert.equal(query.status, 'ACTIVE'); return target; } }) } },
  });
}
test('employee view uses employee permissions but retains original owner identity', async () => {
  const session = await sessionModule().getCurrentSession();
  assert.equal(session.user.id, 'employee');
  assert.equal(session.user.role, 'EMPLOYEE');
  assert.equal(session.impersonator.id, 'owner');
});
test('revoked super admin and suspended owner cannot continue employee access', async () => {
  assert.equal(await sessionModule({ owner: { ...admin, role: 'MANAGER' } }).getCurrentSession(), null);
  assert.equal(await sessionModule({ owner: { ...admin, status: 'SUSPENDED' } }).getCurrentSession(), null);
});
test('expired access or inactive employee safely returns to the real owner', async () => {
  for (const options of [{ until: new Date(0) }, { target: null }]) {
    const session = await sessionModule(options).getCurrentSession();
    assert.equal(session.user.id, 'owner');
    assert.equal(session.impersonator, undefined);
  }
});
function actions(session, target = employee) {
  const writes = [];
  const api = load('src/features/auth/impersonation-actions.ts', {
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`); } }, 'next/cache': { revalidatePath: () => {} },
    mongoose: { isValidObjectId: value => value === 'employee' }, './lib/auth-session': { getCurrentSession: async () => session },
    '@/database/mongodb/models/user': { UserModel: { findOne: query => ({ lean: async () => { assert.equal(query.role, 'EMPLOYEE'); return target; } }) } },
    '@/database/mongodb/models/user-session': { UserSessionModel: { updateOne: async (filter, update) => writes.push({ filter, update }) } },
    '@/database/mongodb/models/system/audit-log': { AuditLogModel: { create: async record => writes.push(record) } },
  });
  return { api, writes };
}
const form = { get: () => 'employee' };
test('employee, manager, anonymous and nested switching cannot mutate sessions', async () => {
  for (const session of [null, { user: { role: 'EMPLOYEE' } }, { user: { role: 'MANAGER' } }, { user: { role: 'SUPER_ADMIN' }, impersonator: { id: 'owner' } }]) {
    const { api, writes } = actions(session);
    assert.ok((await api.startEmployeeSession({}, form)).error);
    assert.equal(writes.length, 0);
  }
});
test('super admin switch is audited and modifies only their own session', async () => {
  const { api, writes } = actions({ sessionId: 'session', user: { id: 'owner', role: 'SUPER_ADMIN', fullName: 'Admin' } });
  await assert.rejects(() => api.startEmployeeSession({}, form), /REDIRECT/);
  assert.equal(writes[0].action, 'EMPLOYEE_SESSION_STARTED');
  assert.equal(writes[1].filter.userId, 'owner');
  assert.equal(writes[1].update.$set.impersonatedUserId, 'employee');
});
test('return action restores only the original owner session', async () => {
  const { api, writes } = actions({ sessionId: 'session', user: { id: 'employee', role: 'EMPLOYEE' }, impersonator: { id: 'owner', fullName: 'Admin' } });
  await assert.rejects(() => api.endEmployeeSession(), /REDIRECT/);
  assert.equal(writes[0].action, 'EMPLOYEE_SESSION_ENDED');
  assert.equal(writes[1].filter.userId, 'owner');
  assert.equal(writes[1].update.$set.impersonatedUserId, null);
});
