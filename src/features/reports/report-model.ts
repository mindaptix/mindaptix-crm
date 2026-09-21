export type EmployeeExportData = {
  employee: { id: string; name: string; email: string };
  month: string;
  generatedAt: string;
  attendance: {
    date: string; status: string; checkIn: string; checkOut: string; workMode: string;
    isLate: boolean; lateMinutes: number; workedMinutes: number; dsrStatus: string;
  }[];
  tasks: {
    title: string; description: string; status: string; priority: string;
    deadline: string; completedAt: string; completedThisMonth: boolean; deadlineMissed: boolean;
  }[];
  dsrs: { date: string; project: string; submittedAt: string; summary: string; accomplishments: string; blockers: string; nextPlan: string }[];
};

export function monthRange(month: string, today: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month > today.slice(0, 7) || month < "2000-01") return null;
  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const end = month === today.slice(0, 7) ? today : `${month}-${lastDay}`;
  const dates = Array.from({ length: Number(end.slice(8, 10)) }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
  return { start: `${month}-01`, end, dates };
}

/** One DSR obligation per attended day, regardless of how many project entries were submitted. */
export function dsrDayStatus({ date, today, time, attended, submitted }: {
  date: string; today: string; time: string; attended: boolean; submitted: boolean;
}) {
  if (submitted) return "Submitted";
  if (!attended || date > today) return "Not required";
  return date === today && time < "19:00" ? "Due today (7 PM IST)" : "Pending";
}

export function reportSummary(report: EmployeeExportData) {
  return {
    attendanceDays: report.attendance.filter((day) => day.checkIn !== "").length,
    lateDays: report.attendance.filter((day) => day.isLate).length,
    lateMinutes: report.attendance.reduce((sum, day) => sum + day.lateMinutes, 0),
    completedTasks: report.tasks.filter((task) => task.completedThisMonth).length,
    missedDeadlines: report.tasks.filter((task) => task.deadlineMissed).length,
    dsrSubmittedDays: report.attendance.filter((day) => day.dsrStatus === "Submitted").length,
    pendingDsrDays: report.attendance.filter((day) => day.dsrStatus === "Pending").length,
  };
}
