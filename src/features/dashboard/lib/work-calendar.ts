export type CompanyHoliday = {
  name: string;
  date: string;
  type: "PUBLIC" | "COMPANY";
};

export const COMPANY_WORK_POLICY = {
  workStart: "10:00",
  workEnd: "19:00",
  weeklyOffDays: [0, 6],
} as const;

export const COMPANY_HOLIDAYS_2026: CompanyHoliday[] = [
  ["Makar Sankranti", "2026-01-15"], ["Kanuma", "2026-01-16"], ["Republic Day", "2026-01-26"],
  ["Holi 2nd Day - Dhuleti", "2026-03-03"], ["Ugadi Festival", "2026-03-19"], ["Eid-Ul-Fitar (Ramzan)", "2026-03-21"],
  ["Shri Ram Navami", "2026-03-27"], ["Good Friday", "2026-04-03"], ["Dr B R Ambedkar Jayanti", "2026-04-14"],
  ["May Day", "2026-05-01"], ["Bakri Id (Id-Uz-Zuha)", "2026-05-28"], ["Moharram", "2026-06-26"],
  ["Independence Day", "2026-08-15"], ["Milad-Un-Nabi", "2026-08-26"], ["Shri Krishna Astami", "2026-09-04"],
  ["Ganesh Chaturthi (1st Day)", "2026-09-14"], ["Mahatma Gandhi Jayanthi", "2026-10-02"], ["Vijaya Dashmi", "2026-10-20"], ["Christmas", "2026-12-25"],
].map(([name, date]) => ({ name, date, type: "PUBLIC" }));

export function mergeCompanyHolidays<T extends { date: string }>(stored: T[]): Array<T | CompanyHoliday> {
  const storedDates = new Set(stored.map((holiday) => holiday.date));
  return [...stored, ...COMPANY_HOLIDAYS_2026.filter((holiday) => !storedDates.has(holiday.date))].sort((a, b) => a.date.localeCompare(b.date));
}

export function getWorkdayBreakdown(startDate: string, endDate: string, holidays: Iterable<string>) {
  const holidayDates = new Set(holidays);
  let calendarDays = 0;
  let weekendDays = 0;
  let holidayDays = 0;
  let workingDays = 0;
  for (const current = new Date(`${startDate}T00:00:00.000Z`), end = new Date(`${endDate}T00:00:00.000Z`); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
    calendarDays += 1;
    const dateKey = current.toISOString().slice(0, 10);
    if (COMPANY_WORK_POLICY.weeklyOffDays.includes(current.getUTCDay() as 0 | 6)) weekendDays += 1;
    else if (holidayDates.has(dateKey)) holidayDays += 1;
    else workingDays += 1;
  }
  return { calendarDays, weekendDays, holidayDays, workingDays };
}
