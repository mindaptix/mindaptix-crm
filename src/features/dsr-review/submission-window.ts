function toUtcDate(dateKey: string) {
  const value = new Date(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== dateKey) throw new Error("Invalid date.");
  return value;
}

export function getWeekStart(dateKey: string) {
  const date = toUtcDate(dateKey);
  const weekday = date.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function getWorkWeekFriday(workDate: string) {
  const date = toUtcDate(workDate);
  const weekday = date.getUTCDay();
  const offset = weekday === 0 ? -2 : 5 - weekday;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** Employees may submit a DSR for a work date only through that work week's Friday. */
export function canEmployeeSubmitDsrForDate(workDate: string, today: string) {
  return workDate <= today && today <= getWorkWeekFriday(workDate);
}
