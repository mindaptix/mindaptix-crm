import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyPlanFilter, summarizeDailyPlan } from '../daily-plan.ts';
const today = '2026-09-22';
const self = title => ({ assignedByUserId: 'employee', title });
test('attendance requires assigned work or two distinct self-created tasks', () => {
  assert.equal(summarizeDailyPlan([], 'employee', today).ready, false);
  assert.equal(summarizeDailyPlan([self('Design login')], 'employee', today).ready, false);
  assert.equal(summarizeDailyPlan([self('Design login'), self(' design LOGIN ')], 'employee', today).ready, false);
  assert.equal(summarizeDailyPlan([self('Design login'), self('Review tests')], 'employee', today).ready, true);
  assert.equal(summarizeDailyPlan([{ assignedByUserId: 'admin', title: 'Assigned work' }], 'employee', today).ready, true);
});
test('daily work filter is employee-scoped and only falls back for legacy records', () => {
  const query = dailyPlanFilter('employee', today);
  assert.equal(query.assignedUserId, 'employee');
  assert.deepEqual(query.$or, [{ workDate: today }, { workDate: { $in: [null, ''] }, dueDate: today }]);
});
