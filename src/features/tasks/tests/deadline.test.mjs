import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTaskDeadline, taskDeadline, missedTaskDeadline } from '../deadline.ts';

const due = parseTaskDeadline('2026-09-21', '18:00');
const task = { dueDate: '2026-09-21', deadlineAt: due, status: 'PENDING' };

test('IST deadline is independent of machine timezone', () => {
  assert.equal(due.toISOString(), '2026-09-21T12:30:00.000Z');
});
test('invalid calendar dates and times are rejected', () => {
  for (const [date, time] of [['2026-02-30', '18:00'], ['2026-13-01', '18:00'], ['2026-09-21', '24:00'], ['', ''], ['2026-09-21', '12:60']]) {
    assert.equal(parseTaskDeadline(date, time), null);
  }
  assert.ok(parseTaskDeadline('2028-02-29', '00:00'));
});
test('pending task becomes missed only after the exact deadline', () => {
  assert.equal(missedTaskDeadline(task, due), false);
  assert.equal(missedTaskDeadline(task, new Date(due.getTime() + 1)), true);
});
test('on-time completion stays on time even when reviewed later', () => {
  for (const status of ['COMPLETED', 'CLOSED']) {
    assert.equal(missedTaskDeadline({ ...task, status, completedAt: due }, new Date('2026-10-01')), false);
  }
});
test('late completion and acceptance remain missed in historical reports', () => {
  for (const status of ['COMPLETED', 'CLOSED']) {
    assert.equal(missedTaskDeadline({ ...task, status, completedAt: new Date(due.getTime() + 1000) }), true);
  }
});
test('persisted missed deadline survives status changes', () => {
  assert.equal(missedTaskDeadline({ ...task, status: 'CLOSED', completedAt: due, deadlineMissedAt: due }), true);
});
test('rejected work is active and can be overdue', () => {
  assert.equal(missedTaskDeadline({ ...task, status: 'REJECTED', completedAt: due }, new Date(due.getTime() + 1)), true);
});
test('legacy date-only task expires at end of day IST', () => {
  const old = { dueDate: '2026-09-21', status: 'PENDING' };
  assert.equal(taskDeadline(old).toISOString(), '2026-09-21T18:29:59.999Z');
  assert.equal(missedTaskDeadline(old, new Date('2026-09-21T18:29:59.999Z')), false);
  assert.equal(missedTaskDeadline(old, new Date('2026-09-21T18:30:00.000Z')), true);
});
test('legacy accepted task without completion timestamp is not falsely marked missed', () => {
  assert.equal(missedTaskDeadline({ dueDate: '2026-01-01', status: 'CLOSED' }), false);
});
