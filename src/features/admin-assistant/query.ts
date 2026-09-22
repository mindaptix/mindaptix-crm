function keyToUtcDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day));
}

function utcDateToKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export type DsrDateRange = { start: string; end: string; label: string };

/** Resolves the reporting period without letting a model choose database scope. */
export function inferDsrDateRange(question: string, today: string): DsrDateRange {
  const normalized = question.toLowerCase();
  if (/\b(month|monthly|month's)\b|is mahine|iss mahine/.test(normalized)) {
    return { start: `${today.slice(0, 7)}-01`, end: today, label: "this month" };
  }
  if (/\b(week|weekly)\b|is hafte|iss hafte/.test(normalized)) {
    const date = keyToUtcDate(today);
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    return { start: utcDateToKey(date), end: today, label: "this week" };
  }
  return { start: today, end: today, label: "today" };
}

export function findMentionedEmployee(question: string, employees: Array<{ id: string; fullName: string }>) {
  const normalized = question.toLowerCase();
  const exact = employees.filter((employee) => normalized.includes(employee.fullName.toLowerCase()));
  if (exact.length === 1) return exact[0];
  const firstNameMatches = employees.filter((employee) => {
    const firstName = employee.fullName.trim().split(/\s+/)[0]?.toLowerCase();
    return Boolean(firstName && new RegExp(`\\b${firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(question));
  });
  return firstNameMatches.length === 1 ? firstNameMatches[0] : null;
}
