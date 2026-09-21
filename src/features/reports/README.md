# Employee monthly Excel export

Admins and super admins open Reports, choose a month, expand an employee, and select **Download employee Excel**.

- `server/employee-report.ts` queries one employee and one month; access is checked independently of the UI.
- `report-model.ts` defines the export contract, month validation, DSR policy and summary counts.
- `workbook.ts` builds a real XLSX using ExcelJS on the server. Text stays text (including strings beginning with `=`). It exports Summary, Attendance, Tasks, DSR Entries and Pending DSRs with frozen headers and filters.
- `components/employee-excel-download.tsx` handles progress, error feedback and download filenames.
- `app/api/reports/employees/[employeeId]/route.ts` authenticates, validates parameters and returns a private, non-cacheable attachment.

## Counting rules

All timestamps use IST. Current-month exports stop at today. Late arrivals use the saved attendance `isLate` and `lateByMinutes` values, not today's company settings applied retroactively. Missing historical late flags are not inferred. Worked minutes are the stored attendance value.

Pending DSRs count attended dates without any DSR for that work date. Today becomes pending at 7 PM IST. Non-attendance days are not counted, and multiple project DSRs on one date count as one submitted day. The workbook states this policy explicitly.

Task rows include tasks due in the selected month through the report date and tasks completed in that month, even if due earlier. Completed-task counts use `completedAt` and a completed/closed status. Missed-deadline counts refer to all listed tasks. Historical records without completion timestamps cannot be attributed to a completion month.

## Validation

```sh
node --experimental-strip-types --test src/features/reports/tests/employee-export.test.mjs
```

The tests compile the workbook builder into a temporary directory, read exported XLSX buffers back, verify values and formatting, and exercise the API with stubbed session/data dependencies. Live MongoDB integration needs configured application credentials.
