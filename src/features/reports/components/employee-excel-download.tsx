"use client";

import { useState } from "react";

export function EmployeeExcelDownload({ employeeId, employeeName, month }: { employeeId: string; employeeName: string; month: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/employees/${encodeURIComponent(employeeId)}?month=${encodeURIComponent(month)}`, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Download failed. Please try again.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      const safeName = employeeName.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 70) || "employee";
      link.download = `${safeName}-${month}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download failed. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <button type="button" disabled={pending} onClick={download} className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
        {pending ? "Preparing Excel…" : "Download employee Excel"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
