# Task deadlines

`deadline.ts` owns deadline parsing, legacy fallback and missed-deadline classification. All input dates/times use Asia/Kolkata (IST); MongoDB stores the exact instant in `deadlineAt`. Existing date-only tasks expire at the end of their due date in IST.

Admins and super admins create deadlines through the existing task action. The employee overview fetches only that user's assignments and passes active work to `components/dashboard-tasks.tsx`. The countdown updates every second; visible dashboards refresh assignments every minute.

Monthly reports group tasks by `dueDate`. A pending, in-progress or rejected task past its deadline is missed. A completed/closed task is missed only if completed late or previously recorded as missed. Admin review time does not penalize an on-time submission. Status mutations preserve a `deadlineMissedAt` marker so reopening cannot erase an already missed deadline. Open overdue tasks are classified at read time, so no scheduled job is required. Old completed tasks without completion timestamps are not assumed late.

Both employee and admin reports use `components/monthly-task-report.tsx`; CSV exports include missed-deadline counts.

Run regression tests with Node supporting TypeScript stripping:

```sh
node --experimental-strip-types --test src/features/tasks/tests/deadline.test.mjs
```
