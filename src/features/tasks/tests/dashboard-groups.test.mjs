import assert from 'node:assert/strict';
import test from 'node:test';
import { groupDashboardTasks } from '../deadline.ts';
const task = (id, deadlineAt, status = 'PENDING') => ({ id, deadlineAt, status, title: id, description: '', priority: 'MEDIUM' });
const now = Date.parse('2026-09-22T10:00:00+05:30');

test('today and overdue are disjoint, including deadlines missed earlier today', () => {
  const groups = groupDashboardTasks([
    task('yesterday', '2026-09-21T18:00:00+05:30'),
    task('earlier', '2026-09-22T09:00:00+05:30'),
    task('today', '2026-09-22T18:00:00+05:30'),
    task('future', '2026-09-23T18:00:00+05:30'),
    task('none', ''),
  ], now);
  assert.deepEqual(groups.overdue.map(t => t.id), ['yesterday', 'earlier']);
  assert.deepEqual(groups.today.map(t => t.id), ['today']);
  assert.deepEqual(groups.upcoming.map(t => t.id), ['future']);
  assert.deepEqual(groups.unscheduled.map(t => t.id), ['none']);
});
test('uses India midnight rather than browser or UTC date', () => {
  const groups = groupDashboardTasks([task('india-today', '2026-09-22T19:00:00Z')], Date.parse('2026-09-22T18:30:00Z'));
  assert.equal(groups.today.length, 1);
});
test('finished tasks are excluded and rejected tasks remain actionable', () => {
  const groups = groupDashboardTasks(['COMPLETED', 'CLOSED', 'REJECTED'].map(status => task(status, '2026-09-21T10:00:00Z', status)), now);
  assert.deepEqual(groups.overdue.map(t => t.id), ['REJECTED']);
});
test('moves to overdue after exact deadline and does not mutate input order', () => {
  const tasks = [task('later', '2026-09-22T14:00:00Z'), task('first', new Date(now).toISOString())];
  assert.deepEqual(groupDashboardTasks(tasks, now).today.map(t => t.id), ['first', 'later']);
  assert.deepEqual(groupDashboardTasks(tasks, now + 1).overdue.map(t => t.id), ['first']);
  assert.equal(tasks[0].id, 'later');
});
