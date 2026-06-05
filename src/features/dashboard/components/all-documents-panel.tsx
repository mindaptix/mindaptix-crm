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
      <div
        className="overflow-hidden rounded-[1.8rem]"
        style={{ background: "linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#8b5cf6 100%)", boxShadow: "0 12px 40px rgba(124,58,237,0.35)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 px-7 py-6">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-violet-200">Admin View</p>
            <h1 className="mt-1 text-2xl font-black text-white">Employee Documents</h1>
            <p className="mt-1 text-[0.78rem] text-violet-200">
              {data.totalDocuments} document{data.totalDocuments !== 1 ? "s" : ""} from {data.totalEmployees} employee{data.totalEmployees !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="border-t border-white/10 bg-white/5 px-6 py-3">
          <div className="relative flex items-center">
            <svg className="pointer-events-none absolute left-3.5 text-white/40" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30"
              placeholder="Search by employee name or document type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {deleteState.error   && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{deleteState.error}</div>}
      {deleteState.success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{deleteState.success}</div>}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
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
    <div
      className="overflow-hidden rounded-[1.8rem]"
      style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 4px 20px rgba(15,23,42,0.05)" }}
    >
      {/* Employee header */}
      <button
        className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50/60"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)" }}
        >
          {initials(group.employeeName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800">{group.employeeName}</p>
          <p className="text-[0.68rem] text-slate-400">{group.employeeEmail}</p>
        </div>
        <span
          className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[0.62rem] font-bold text-violet-700"
        >
          {group.documents.length} doc{group.documents.length !== 1 ? "s" : ""}
        </span>
        <span className="text-slate-400 transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>

      {/* Documents */}
      {open && (
        <div className="border-t border-slate-50 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
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
                      className="flex items-center gap-1 rounded-xl border border-violet-200 bg-white px-2.5 py-1.5 text-[0.7rem] font-semibold text-violet-700 transition hover:bg-violet-50"
                    >
                      ↓ Download
                    </a>
                    <form action={deleteAction}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <button
                        className="rounded-xl border border-rose-100 bg-white px-2.5 py-1.5 text-[0.7rem] font-semibold text-rose-500 transition hover:bg-rose-50"
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
