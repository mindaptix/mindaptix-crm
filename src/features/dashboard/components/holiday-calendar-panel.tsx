import { COMPANY_WORK_POLICY } from "@/features/dashboard/lib/work-calendar";
import type { HolidayEntry } from "@/features/dashboard/types";

export function HolidayCalendarPanel({ holidays }: { holidays: HolidayEntry[] }) {
  return <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">Company calendar</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Holidays & working hours</h1>
      <p className="mt-2 text-sm text-slate-500">Working hours are {COMPANY_WORK_POLICY.workStart}–{COMPANY_WORK_POLICY.workEnd}. Saturday and Sunday are weekly offs.</p>
    </section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Upcoming holidays</h2><p className="mt-1 text-sm text-slate-500">Official company calendar for 2026.</p></div>
      <div className="divide-y divide-slate-100">
        {holidays.map((holiday) => <div className="flex items-center justify-between gap-4 px-5 py-4" key={holiday.id}>
          <div><p className="text-sm font-semibold text-slate-800">{holiday.name}</p>{holiday.description ? <p className="mt-1 text-xs text-slate-500">{holiday.description}</p> : null}</div>
          <time className="shrink-0 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{holiday.date}</time>
        </div>)}
      </div>
    </section>
  </div>;
}
