"use client";

import { useActionState, useMemo, useState } from "react";
import { addAsset, assignAsset, returnAsset, deleteAsset, updateAsset } from "@/features/dashboard/actions/assets";
import type { AssetEntry, AssetsPageData, EmployeeOption } from "@/features/dashboard/types";

// ── Config ────────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  LAPTOP: "💻", PHONE: "📱", MONITOR: "🖥️", KEYBOARD: "⌨️",
  MOUSE: "🖱️", HEADSET: "🎧", TABLET: "📟", HARD_DISK: "💾",
  WEBCAM: "📷", CHAIR: "🪑", OTHER: "📦",
};

const CATEGORY_LABELS: Record<string, string> = {
  LAPTOP: "Laptop", PHONE: "Phone", MONITOR: "Monitor", KEYBOARD: "Keyboard",
  MOUSE: "Mouse", HEADSET: "Headset", TABLET: "Tablet", HARD_DISK: "Hard Disk",
  WEBCAM: "Webcam", CHAIR: "Chair", OTHER: "Other",
};

const STATUS_CFG: Record<string, { bg: string; text: string; border: string }> = {
  AVAILABLE: { bg: "rgba(16,185,129,0.08)",  text: "#059669", border: "rgba(16,185,129,0.25)" },
  ASSIGNED:  { bg: "rgba(99,102,241,0.08)",  text: "#4f46e5", border: "rgba(99,102,241,0.25)" },
  RETURNED:  { bg: "rgba(100,116,139,0.08)", text: "#475569", border: "rgba(100,116,139,0.2)" },
  LOST:      { bg: "rgba(239,68,68,0.08)",   text: "#dc2626", border: "rgba(239,68,68,0.25)" },
  DAMAGED:   { bg: "rgba(245,158,11,0.08)",  text: "#d97706", border: "rgba(245,158,11,0.25)" },
};

const CONDITION_CFG: Record<string, string> = {
  NEW: "text-emerald-600", GOOD: "text-blue-600", FAIR: "text-amber-600", POOR: "text-rose-600",
};

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

// ── Main component ────────────────────────────────────────────────────────────

type Props = { data: AssetsPageData };

export function AssetsPanel({ data }: Props) {
  const [tab, setTab] = useState<"list" | "add">(data.canManage ? "list" : "list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.assets.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && a.category !== categoryFilter) return false;
      if (!q) return true;
      return [a.name, a.serialNumber, a.assignedToName, a.category, a.notes].join(" ").toLowerCase().includes(q);
    });
  }, [data.assets, search, statusFilter, categoryFilter]);

  const summaryCards = [
    { label: "Total assets", value: data.totalAssets, tone: "text-slate-900" },
    { label: "Assigned", value: data.assignedCount, tone: "text-indigo-700" },
    { label: "Available", value: data.availableCount, tone: "text-emerald-700" },
    { label: "Needs attention", value: data.lostOrDamagedCount, tone: "text-amber-700" },
  ];

  const categories = [...new Set(data.assets.map((a) => a.category))];

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* Hero */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Company assets</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Asset register</h1>
            <p className="mt-1 text-sm text-slate-500">Track ownership, condition, procurement details, and returns.</p>
          </div>
          {data.canManage && (
            <div className="flex gap-2">
              {(["list", "add"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  type="button"
                  className={`rounded-md px-3.5 py-2 text-sm font-semibold transition ${tab === t ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {t === "list" ? "All Assets" : "+ Add Asset"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary stat row */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-5 sm:grid-cols-4">
          {summaryCards.map((c) => (
            <div key={c.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className={`text-2xl font-semibold ${c.tone}`}>{c.value}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {tab === "add" && data.canManage && <AddAssetForm />}

      {tab === "list" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative flex flex-1 min-w-50 items-center">
              <svg className="pointer-events-none absolute left-3.5 text-slate-400" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                placeholder="Search assets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              {["AVAILABLE", "ASSIGNED", "RETURNED", "LOST", "DAMAGED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {categories.length > 1 && (
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                ))}
              </select>
            )}
          </div>

          {/* Asset grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
              <p className="text-3xl">📦</p>
              <p className="mt-3 font-semibold text-slate-600">No assets found</p>
              <p className="mt-1 text-sm text-slate-400">
                {data.canManage ? "Add your first asset using the '+ Add Asset' button." : "No assets have been assigned to you."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((asset) => (
                <AssetCard key={asset.id} asset={asset} canManage={data.canManage} employeeOptions={data.employeeOptions} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Asset Card ────────────────────────────────────────────────────────────────

function AssetCard({ asset, canManage, employeeOptions }: { asset: AssetEntry; canManage: boolean; employeeOptions: EmployeeOption[] }) {
  const [updateState, updateAction, updatePending] = useActionState(updateAsset, {});
  const [assignState, assignAction, assignPending] = useActionState(assignAsset, {});
  const [returnState, returnAction, returnPending] = useActionState(returnAsset, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAsset, {});
  const [expanded, setExpanded] = useState(false);

  const sc = STATUS_CFG[asset.status] ?? STATUS_CFG.AVAILABLE;
  const icon = CATEGORY_ICONS[asset.category] ?? "📦";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-xl"
            >
              {icon}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900">{asset.name}</p>
              <p className="text-[0.7rem] text-slate-400">
                {[asset.brand, asset.model].filter(Boolean).join(" · ") || CATEGORY_LABELS[asset.category] || asset.category}
              </p>
            </div>
          </div>
          <span
            className="shrink-0 rounded-md border px-2 py-1 text-[0.65rem] font-semibold"
            style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
          >
            {asset.status}
          </span>
        </div>

        {/* Details */}
        <div className="mt-4 space-y-1.5">
          {asset.serialNumber && (
            <InfoRow icon="🔢" label="Serial" value={asset.serialNumber} />
          )}
          {asset.assignedToName && (
            <InfoRow icon="👤" label="Assigned to" value={asset.assignedToName} />
          )}
          {asset.assignedAt && (
            <InfoRow icon="📅" label="Since" value={asset.assignedAt} />
          )}
          {asset.purchasePrice > 0 && (
            <InfoRow icon="💰" label="Value" value={INR.format(asset.purchasePrice)} />
          )}
          {(asset.status === "LOST" || asset.status === "DAMAGED") && asset.fineAmount > 0 && (
            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-rose-600">Fine charged</p>
              <p className="mt-0.5 text-sm font-semibold text-rose-700">{INR.format(asset.fineAmount)}</p>
              {asset.fineNote && <p className="mt-0.5 text-[0.68rem] text-rose-500">{asset.fineNote}</p>}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[0.65rem]">⚙️</span>
            <span className={`text-[0.72rem] font-semibold ${CONDITION_CFG[asset.condition] ?? ""}`}>{asset.condition}</span>
          </div>
        </div>

        {/* Error/success */}
        {(updateState.error || assignState.error || returnState.error || deleteState.error) && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[0.72rem] font-medium text-rose-700">
            {updateState.error ?? assignState.error ?? returnState.error ?? deleteState.error}
          </p>
        )}
        {(updateState.success || assignState.success || returnState.success || deleteState.success) && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[0.72rem] font-medium text-emerald-700">
            {updateState.success ?? assignState.success ?? returnState.success ?? deleteState.success}
          </p>
        )}

        {/* Admin actions */}
        {canManage && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <button
              className="mb-3 flex w-full items-center justify-between text-[0.72rem] font-semibold text-slate-500"
              onClick={() => setExpanded((v) => !v)}
              type="button"
            >
              Manage Asset
              <span style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
            </button>

            {expanded && (
              <div className="space-y-3">
                <UpdateAssetForm asset={asset} action={updateAction} pending={updatePending} />

                {asset.status === "AVAILABLE" && employeeOptions.length > 0 && (
                  <form action={assignAction} className="flex gap-2">
                    <input type="hidden" name="assetId" value={asset.id} />
                    <select className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-700 outline-none focus:border-indigo-500" name="userId" required>
                      <option value="">Select employee…</option>
                      {employeeOptions.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </select>
                    <button
                      className="rounded-md bg-indigo-600 px-3 py-2 text-[0.78rem] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                      disabled={assignPending}
                      type="submit"
                    >
                      {assignPending ? "…" : "Assign"}
                    </button>
                  </form>
                )}

                {asset.status === "ASSIGNED" && (
                  <ReturnForm assetId={asset.id} action={returnAction} pending={returnPending} />
                )}

                <form action={deleteAction}>
                  <input type="hidden" name="assetId" value={asset.id} />
                  <button
                    className="w-full rounded-md border border-rose-200 bg-rose-50 py-2 text-[0.78rem] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    disabled={deletePending}
                    type="submit"
                    onClick={(e) => { if (!confirm("Delete this asset permanently?")) e.preventDefault(); }}
                  >
                    {deletePending ? "Deleting…" : "🗑 Delete Asset"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Return / Lost / Damaged Form ─────────────────────────────────────────────

function UpdateAssetForm({
  action,
  asset,
  pending,
}: {
  action: (formData: FormData) => void;
  asset: AssetEntry;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <button
        className="flex w-full items-center justify-between text-[0.78rem] font-bold text-slate-700"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Edit Details
        <span style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </button>

      {open && (
        <form action={action} className="mt-3 space-y-2">
          <input name="assetId" type="hidden" value={asset.id} />
          <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-800 outline-none focus:border-indigo-500" defaultValue={asset.name} name="name" placeholder="Asset name" required />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-800 outline-none focus:border-indigo-500" defaultValue={asset.brand} name="brand" placeholder="Brand" />
            <input className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-800 outline-none focus:border-indigo-500" defaultValue={asset.model} name="model" placeholder="Model" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-800 outline-none focus:border-indigo-500" defaultValue={asset.category} name="category" required>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-800 outline-none focus:border-indigo-500" defaultValue={asset.condition} name="condition">
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </div>
          <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-800 outline-none focus:border-indigo-500" defaultValue={asset.serialNumber} name="serialNumber" placeholder="Serial number" />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-800 outline-none focus:border-indigo-500" defaultValue={asset.purchaseDate} name="purchaseDate" type="date" />
            <input className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-800 outline-none focus:border-indigo-500" defaultValue={asset.purchasePrice || ""} min="0" name="purchasePrice" placeholder="Purchase price" type="number" />
          </div>
          <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-800 outline-none focus:border-indigo-500" defaultValue={asset.notes} name="notes" placeholder="Notes" />
          <button
            className="w-full rounded-md bg-indigo-600 py-2 text-[0.78rem] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            {pending ? "Updating…" : "Update Asset"}
          </button>
        </form>
      )}
    </div>
  );
}

function ReturnForm({
  assetId,
  action,
  pending,
}: {
  assetId: string;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [status, setStatus] = useState("AVAILABLE");

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="assetId" value={assetId} />
      <select
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.8rem] text-slate-700 outline-none focus:border-indigo-500"
        name="newStatus"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="AVAILABLE">Returned — Available</option>
        <option value="LOST">Reported Lost</option>
        <option value="DAMAGED">Reported Damaged</option>
      </select>

      {(status === "LOST" || status === "DAMAGED") && (
        <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50 p-3">
          <p className="text-[0.68rem] font-bold text-rose-600 uppercase tracking-wider">
            {status === "LOST" ? "Asset Gum Ho Gaya" : "Asset Kharab Ho Gaya"} — Fine Details
          </p>
          <label className="block">
            <span className="mb-1 block text-[0.72rem] font-semibold text-slate-600">Fine Amount (₹)</span>
            <input
              className="w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-400"
              min="0"
              name="fineAmount"
              placeholder="0"
              type="number"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[0.72rem] font-semibold text-slate-600">Fine Note (optional)</span>
            <input
              className="w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-400"
              name="fineNote"
              placeholder="e.g. Employee se recover kiya jaayega"
            />
          </label>
        </div>
      )}

      <button
        className="w-full rounded-md border border-amber-200 bg-amber-50 py-2 text-[0.78rem] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "…" : "Update Status"}
      </button>
    </form>
  );
}

// ── Add Asset Form ────────────────────────────────────────────────────────────

function AddAssetForm() {
  const [state, action, pending] = useActionState(addAsset, {});

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">New record</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">Add asset</h2>
        <p className="text-sm text-slate-500">Register a new company asset in the system.</p>
      </div>

      <form action={action} className="p-6">
        {state.error   && <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.error}</div>}
        {state.success && <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{state.success}</div>}

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="col-span-full block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Asset name *</span>
            <input className={INPUT} name="name" placeholder="e.g. MacBook Pro 14-inch" required />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Brand</span>
            <input className={INPUT} name="brand" placeholder="e.g. Apple, Dell, Samsung" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Model</span>
            <input className={INPUT} name="model" placeholder="e.g. iPhone 6S, ThinkPad X1" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Category *</span>
            <select className={INPUT} name="category" required>
              <option value="">Select category…</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{CATEGORY_ICONS[v]} {l}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Condition</span>
            <select className={INPUT} name="condition" defaultValue="GOOD">
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Serial number</span>
            <input className={INPUT} name="serialNumber" placeholder="e.g. IMEI, service tag, asset code" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Purchase date</span>
            <input className={INPUT} name="purchaseDate" type="date" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Purchase price</span>
            <input className={INPUT} min="0" name="purchasePrice" placeholder="0" type="number" />
          </label>


          <label className="col-span-full block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Notes</span>
            <input className={INPUT} name="notes" placeholder="Any additional details…" />
          </label>
        </div>

        <button
          className="mt-6 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Adding…" : "Add Asset"}
        </button>
      </form>
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.65rem]">{icon}</span>
      <span className="text-[0.68rem] text-slate-400">{label}:</span>
      <span className="text-[0.72rem] font-semibold text-slate-700 truncate">{value}</span>
    </div>
  );
}
