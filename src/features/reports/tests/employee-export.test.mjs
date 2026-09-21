import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import ExcelJS from 'exceljs';
import { dsrDayStatus, monthRange, reportSummary } from '../report-model.ts';

const temporary = mkdtempSync(join(tmpdir(), 'employee-export-test-'));
after(() => rmSync(temporary, { recursive: true, force: true }));
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), 'src/features/reports/workbook.ts', '--outDir', temporary, '--module', 'commonjs', '--target', 'es2020', '--esModuleInterop', '--skipLibCheck']);
symlinkSync(resolve('node_modules'), join(temporary, 'node_modules'), 'dir');
const { buildEmployeeWorkbook } = createRequire(join(temporary, 'test.cjs'))('./workbook.js');
const fixture = {
  employee: { id: '123', name: '=HYPERLINK("https://example.com")', email: 'employee@example.com' }, month: '2026-09', generatedAt: '21 Sept 2026 07:00 PM IST',
  attendance: [
    { date: '2026-09-01', status: 'Present', checkIn: '1 Sept 2026 10:30 AM IST', checkOut: '1 Sept 2026 07:00 PM IST', workMode: 'OFFICE', isLate: true, lateMinutes: 30, workedMinutes: 510, dsrStatus: 'Pending' },
    { date: '2026-09-02', status: 'Present', checkIn: '2 Sept 2026 10:00 AM IST', checkOut: '', workMode: 'WFH', isLate: false, lateMinutes: 0, workedMinutes: 0, dsrStatus: 'Submitted' },
    { date: '2026-09-03', status: 'On leave', checkIn: '', checkOut: '', workMode: '', isLate: false, lateMinutes: 0, workedMinutes: 0, dsrStatus: 'Not required' },
  ],
  tasks: [{ title: 'Completed work', description: 'Delivered client report', status: 'CLOSED', priority: 'HIGH', deadline: '31 Aug 2026 06:00 PM IST', completedAt: '1 Sept 2026 11:00 AM IST', completedThisMonth: true, deadlineMissed: true }],
  dsrs: [1, 2].map((n) => ({ date: '2026-09-02', project: `Project ${n}`, submittedAt: '2 Sept 2026 06:00 PM IST', summary: 'Work update', accomplishments: 'Completed work', blockers: '', nextPlan: 'Next task' })),
};

test('month validation handles leap years, current month and future input', () => {
  assert.equal(monthRange('2024-02', '2026-09-21').dates.length, 29);
  assert.equal(monthRange('2026-09', '2026-09-21').dates.length, 21);
  for (const month of ['2026-13', '2026-10', 'bad', '1999-01']) assert.equal(monthRange(month, '2026-09-21'), null);
});
test('pending DSR uses attendance and 7 PM cutoff, not calendar-day count', () => {
  const base = { date: '2026-09-21', today: '2026-09-21', time: '18:59', attended: true, submitted: false };
  assert.equal(dsrDayStatus(base), 'Due today (7 PM IST)');
  assert.equal(dsrDayStatus({ ...base, time: '19:00' }), 'Pending');
  assert.equal(dsrDayStatus({ ...base, date: '2026-09-20' }), 'Pending');
  assert.equal(dsrDayStatus({ ...base, attended: false }), 'Not required');
  assert.equal(dsrDayStatus({ ...base, submitted: true }), 'Submitted');
});
test('summary counts DSR days, late arrivals and cross-month completed work', () => {
  assert.deepEqual(reportSummary(fixture), { attendanceDays: 2, lateDays: 1, lateMinutes: 30, completedTasks: 1, missedDeadlines: 1, dsrSubmittedDays: 1, pendingDsrDays: 1 });
});
test('download is a readable XLSX with five complete formatted worksheets', async () => {
  const buffer = await buildEmployeeWorkbook(fixture);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(buffer);
  assert.deepEqual(book.worksheets.map((sheet) => sheet.name), ['Summary', 'Attendance', 'Tasks', 'DSR Entries', 'Pending DSRs']);
  assert.equal(book.getWorksheet('Summary').getCell('B2').value, fixture.employee.name);
  assert.equal(book.getWorksheet('Summary').getCell('B2').type, ExcelJS.ValueType.String);
  assert.equal(book.getWorksheet('Attendance').getCell('G2').value, 30);
  assert.equal(book.getWorksheet('Pending DSRs').rowCount, 2);
  assert.equal(book.getWorksheet('Pending DSRs').getCell('A2').value, '2026-09-01');
  assert.equal(book.getWorksheet('Tasks').getCell('G2').value, 'Yes');
  assert.equal(book.getWorksheet('DSR Entries').rowCount, 3);
  for (const sheet of book.worksheets) {
    assert.equal(sheet.views[0].state, 'frozen');
    assert.ok(sheet.autoFilter);
    assert.equal(sheet.getRow(1).height, 30);
  }
});
test('empty month still produces valid sheets with zero totals', async () => {
  const report = { ...fixture, attendance: [], tasks: [], dsrs: [] };
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await buildEmployeeWorkbook(report));
  assert.equal(book.getWorksheet('Pending DSRs').rowCount, 1);
  assert.equal(reportSummary(report).pendingDsrDays, 0);
});

const source = readFileSync('src/app/api/reports/employees/[employeeId]/route.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function route(role) {
  let queries = 0;
  const exports = {};
  const deps = {
    '@/features/auth/lib/auth-session': { getCurrentSession: async () => role ? { user: { role } } : null },
    '@/features/reports/server/employee-report': { getEmployeeExport: async () => { queries++; return fixture; } },
    '@/features/reports/workbook': { buildEmployeeWorkbook },
    '@/features/reports/report-model': { monthRange },
    '@/shared/lib/india-time': { formatIndiaDateKey: () => '2026-09-21' },
  };
  runInNewContext(compiled, { exports, require: (id) => { assert.ok(deps[id], id); return deps[id]; }, Response, URL, Uint8Array });
  return { GET: exports.GET, queries: () => queries };
}
const params = { params: Promise.resolve({ employeeId: '1234567890abcdef12345678' }) };
test('export rejects unauthenticated and employee access before querying reports', async () => {
  for (const [role, status] of [[null, 401], ['EMPLOYEE', 403], ['SALES', 403]]) {
    const endpoint = route(role);
    assert.equal((await endpoint.GET(new Request('http://localhost/api?month=2026-09'), params)).status, status);
    assert.equal(endpoint.queries(), 0);
  }
});
test('admin and super admin receive private XLSX attachments; invalid months are rejected', async () => {
  for (const role of ['MANAGER', 'SUPER_ADMIN']) {
    const endpoint = route(role);
    const result = await endpoint.GET(new Request('http://localhost/api?month=2026-09'), params);
    assert.equal(result.status, 200);
    assert.match(result.headers.get('Content-Type'), /spreadsheetml/);
    assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
    assert.match(result.headers.get('Content-Disposition'), /2026-09.xlsx/);
    assert.equal((await endpoint.GET(new Request('http://localhost/api?month=2026-13'), params)).status, 400);
  }
});
