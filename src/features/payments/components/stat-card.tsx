

export function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      {sub ? <p className="mt-2 text-[0.68rem] leading-4 text-slate-500">{sub}</p> : null}
    </div>
  );
}
