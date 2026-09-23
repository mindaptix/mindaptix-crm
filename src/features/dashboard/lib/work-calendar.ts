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
  ["Republic Day", "2026-01-26"], ["Holi", "2026-03-04"], ["Id-Ul-Fittr", "2026-03-21"],
  ["Shri Ram Navami", "2026-03-26"], ["Dr B R Ambedkar Jayanti", "2026-04-14"], ["Bakri Id (Id-Uz-Zuha)", "2026-05-28"],
  ["Independence Day", "2026-08-15"], ["Janmashtami", "2026-09-04"], ["Birthday Of Gandhiji", "2026-10-02"],
  ["Dussehra", "2026-10-20"], ["Maharishi Valmiki Jayanti", "2026-10-26"], ["Gowardhan Puja", "2026-11-09"],
  ["Guru Nanak Jayanti", "2026-11-24"], ["Christmas", "2026-12-25"],
].map(([name, date]) => ({ name, date, type: "PUBLIC" }));

const REPLACED_DEFAULT_HOLIDAY_DATES = new Set([
  "2026-01-15", "2026-01-16", "2026-01-26", "2026-03-03", "2026-03-19", "2026-03-21", "2026-03-27",
  "2026-04-03", "2026-04-14", "2026-05-01", "2026-05-28", "2026-06-26", "2026-08-15", "2026-08-26",
  "2026-09-04", "2026-09-14", "2026-10-02", "2026-10-20", "2026-12-25",
]);

export function mergeCompanyHolidays<T extends { date: string }>(stored: T[]): Array<T | CompanyHoliday> {
  const customHolidays = stored.filter((holiday) => !REPLACED_DEFAULT_HOLIDAY_DATES.has(holiday.date));
  const storedDates = new Set(customHolidays.map((holiday) => holiday.date));
  return [...customHolidays, ...COMPANY_HOLIDAYS_2026.filter((holiday) => !storedDates.has(holiday.date))].sort((a, b) => a.date.localeCompare(b.date));
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
