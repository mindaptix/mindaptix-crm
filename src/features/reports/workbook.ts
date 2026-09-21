import ExcelJS from "exceljs";
import { reportSummary, type EmployeeExportData } from "./report-model";

type Cell = string | number;

export async function buildEmployeeWorkbook(report: EmployeeExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mindaptix CRM";
  workbook.title = `${report.employee.name} — ${report.month}`;
  const summary = reportSummary(report);

  function sheet(name: string, headers: string[], rows: Cell[][], widths: number[]) {
    const page = workbook.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1 }],
      pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    page.columns = headers.map((header, index) => ({ header, width: widths[index] ?? 24 }));
    page.addRows(rows);
    page.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: headers.length } };
    page.getRow(1).height = 30;
    page.getRow(1).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    page.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      let lines = 1;
      row.eachCell((cell, column) => {
        // Plain text values remain text, including strings starting with '='.
        cell.font = { name: "Calibri", size: 11, color: { argb: "FF334155" } };
        cell.alignment = { vertical: "top", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber % 2 ? "FFF1F5F9" : "FFFFFFFF" } };
        lines = Math.max(lines, String(cell.value ?? "").split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(10, (widths[column - 1] ?? 24) - 3))), 0));
      });
      row.height = Math.min(409, Math.max(25, lines * 15 + 8));
    });
    page.pageSetup.printTitlesRow = "1:1";
    return page;
  }

  sheet("Summary", ["Metric", "Value"], [
    ["Employee", report.employee.name], ["Email", report.employee.email], ["Month", report.month],
    ["Generated at", report.generatedAt], ["Attendance days", summary.attendanceDays],
    ["Late arrival days", summary.lateDays], ["Total late minutes", summary.lateMinutes],
    ["Tasks completed in month", summary.completedTasks], ["Missed deadlines (listed tasks)", summary.missedDeadlines],
    ["DSR submitted days", summary.dsrSubmittedDays], ["DSR entries", report.dsrs.length], ["Pending DSR days", summary.pendingDsrDays],
    ["DSR policy", "One DSR per attended day. Today becomes pending at 7 PM IST. Days without attendance are not counted as pending; multiple entries on one day count as one submitted day."],
    ["Late arrival policy", "Uses saved isLate and lateByMinutes values from attendance, preserving the policy applied at check-in. Missing historical late flags are not inferred."],
    ["Task scope", "Tasks due in this month through the report date, plus tasks completed in this month. Late completions remain marked as missed deadlines."],
    ["Dates and times", "All dates/times are IST. Current-month reports include only dates through today. Not marked does not automatically mean absent."],
  ], [38, 100]);

  const attendance = sheet("Attendance", ["Date", "Attendance", "Check-in (IST)", "Check-out (IST)", "Work mode", "Late arrival", "Late minutes", "Worked minutes", "DSR status"],
    report.attendance.map((day) => [day.date, day.status, day.checkIn || "Not marked", day.checkOut || "Not marked", day.workMode, day.isLate ? "Yes" : "No", day.lateMinutes, day.workedMinutes, day.dsrStatus]), [14, 18, 31, 31, 14, 14, 14, 17, 25]);
  report.attendance.forEach((day, index) => {
    if (day.isLate) attendance.getRow(index + 2).getCell(6).font = { bold: true, color: { argb: "FFB45309" } };
  });
  sheet("Tasks", ["Task", "Description", "Status", "Priority", "Deadline (IST)", "Completed at (IST)", "Completed this month", "Deadline missed"],
    report.tasks.map((task) => [task.title, task.description, task.status, task.priority, task.deadline, task.completedAt, task.completedThisMonth ? "Yes" : "No", task.deadlineMissed ? "Yes" : "No"]), [35, 65, 18, 12, 31, 31, 24, 20]);
  sheet("DSR Entries", ["Work date", "Project", "Submitted at (IST)", "Summary", "Accomplishments", "Blockers", "Next plan"],
    report.dsrs.map((dsr) => [dsr.date, dsr.project, dsr.submittedAt, dsr.summary, dsr.accomplishments, dsr.blockers, dsr.nextPlan]), [14, 25, 31, 45, 65, 45, 45]);
  sheet("Pending DSRs", ["Date", "Attendance", "Check-in (IST)", "Reason"],
    report.attendance.filter((day) => day.dsrStatus === "Pending").map((day) => [day.date, day.status, day.checkIn, "Attendance recorded; no DSR submitted for this work date."]), [14, 18, 31, 70]);

  return workbook.xlsx.writeBuffer();
}
