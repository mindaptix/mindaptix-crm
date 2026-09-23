"use client";

import { useActionState, useState } from "react";
import { deleteEmployeeDocument } from "@/features/dashboard/actions/documents";
import type { EmployeeDocumentEntry } from "@/features/dashboard/types";

const DOC_TYPE_LABELS: Record<string, string> = {
  OFFER_LETTER: "Offer Letter", APPOINTMENT_LETTER: "Appointment Letter",
  RELIEVING_LETTER: "Relieving Letter", PAN_CARD: "PAN Card",
  AADHAAR_CARD: "Aadhaar Card", BANK_DETAILS: "Bank Details",
  EDUCATIONAL_CERTIFICATE: "Educational Certificate", EXPERIENCE_LETTER: "Experience Letter",
  AGREEMENT: "Agreement", NDA: "NDA", OTHER: "Other",
};

const DOC_ICONS: Record<string, string> = {
  OFFER_LETTER: "📄", APPOINTMENT_LETTER: "📋", RELIEVING_LETTER: "📃",
  PAN_CARD: "🪪", AADHAAR_CARD: "🪪", BANK_DETAILS: "🏦",
  EDUCATIONAL_CERTIFICATE: "🎓", EXPERIENCE_LETTER: "💼",
  AGREEMENT: "📝", NDA: "🔒", OTHER: "📁",
};

function initials(name: string) {
  return name.trim().split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

type Group = {
  userId: string;
  employeeName: string;
  employeeEmail: string;
  documents: EmployeeDocumentEntry[];
};

type Props = {
  data: {
    groups: Group[];
    totalDocuments: number;
    totalEmployees: number;
  };
};

export function AllDocumentsPanel({ data }: Props) {
  const [search, setSearch] = useState("");
  const [deleteState, deleteAction] = useActionState(deleteEmployeeDocument, {});

  const filtered = data.groups.filter((g) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [g.employeeName, g.employeeEmail, ...g.documents.map((d) => DOC_TYPE_LABELS[d.documentType] ?? d.documentType)].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* Hero */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">Admin register</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Employee documents</h1>
            <p className="mt-1 text-sm text-slate-500">
              {data.totalDocuments} document{data.totalDocuments !== 1 ? "s" : ""} from {data.totalEmployees} employee{data.totalEmployees !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="relative flex items-center">
            <svg className="pointer-events-none absolute left-3.5 text-slate-400" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              placeholder="Search by employee name or document type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {deleteState.error   && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{deleteState.error}</div>}
      {deleteState.success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{deleteState.success}</div>}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <p className="text-4xl">📁</p>
            <p className="mt-3 font-semibold text-slate-600">No documents found</p>
            <p className="mt-1 text-sm text-slate-400">Employees have not uploaded any documents yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((group) => (
            <EmployeeDocGroup key={group.userId} group={group} deleteAction={deleteAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeDocGroup({
  group,
  deleteAction,
}: {
  group: Group;
  deleteAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Employee header */}
      <button
        className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50/60"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[0.65rem] font-bold text-white"
        >
          {initials(group.employeeName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800">{group.employeeName}</p>
          <p className="text-[0.68rem] text-slate-400">{group.employeeEmail}</p>
        </div>
        <span
          className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[0.65rem] font-semibold text-violet-700"
        >
          {group.documents.length} doc{group.documents.length !== 1 ? "s" : ""}
        </span>
        <span className="text-slate-400 transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>

      {/* Documents */}
      {open && (
        <div className="border-t border-slate-200 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <span className="text-2xl">{DOC_ICONS[doc.documentType] ?? "📁"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
                  <p className="mt-0.5 truncate text-[0.68rem] text-slate-400">{doc.fileName}</p>
                  <p className="mt-0.5 text-[0.65rem] text-slate-400">Uploaded: {doc.uploadedAt}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="flex items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-[0.7rem] font-semibold text-violet-700 transition hover:bg-violet-50"
                    >
                      ↓ Download
                    </a>
                    <form action={deleteAction}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <button
                        className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-[0.7rem] font-semibold text-rose-600 transition hover:bg-rose-50"
                        type="submit"
                        onClick={(e) => { if (!confirm("Delete this document?")) e.preventDefault(); }}
                      >
                        🗑
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
