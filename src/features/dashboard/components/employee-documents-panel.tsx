"use client";

import { useActionState } from "react";
import { uploadEmployeeDocument, deleteEmployeeDocument } from "@/features/dashboard/actions/documents";
import type { EmployeeDocumentsPageData, EmployeeDocumentEntry } from "@/features/dashboard/types";

// ── Config ────────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  OFFER_LETTER:           "Offer Letter",
  APPOINTMENT_LETTER:     "Appointment Letter",
  RELIEVING_LETTER:       "Relieving Letter",
  PAN_CARD:               "PAN Card",
  AADHAAR_CARD:           "Aadhaar Card",
  BANK_DETAILS:           "Bank Details",
  EDUCATIONAL_CERTIFICATE:"Educational Certificate",
  EXPERIENCE_LETTER:      "Experience Letter",
  AGREEMENT:              "Agreement",
  NDA:                    "NDA",
  OTHER:                  "Other",
};

const DOC_TYPE_ICONS: Record<string, string> = {
  OFFER_LETTER: "📄", APPOINTMENT_LETTER: "📋", RELIEVING_LETTER: "📃",
  PAN_CARD: "🪪", AADHAAR_CARD: "🪪", BANK_DETAILS: "🏦",
  EDUCATIONAL_CERTIFICATE: "🎓", EXPERIENCE_LETTER: "💼",
  AGREEMENT: "📝", NDA: "🔒", OTHER: "📁",
};

const DOC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  OFFER_LETTER:           { bg: "rgba(99,102,241,0.07)",  text: "#4f46e5", border: "rgba(99,102,241,0.2)" },
  APPOINTMENT_LETTER:     { bg: "rgba(16,185,129,0.07)",  text: "#059669", border: "rgba(16,185,129,0.2)" },
  RELIEVING_LETTER:       { bg: "rgba(100,116,139,0.07)", text: "#475569", border: "rgba(100,116,139,0.2)" },
  PAN_CARD:               { bg: "rgba(245,158,11,0.07)",  text: "#d97706", border: "rgba(245,158,11,0.2)" },
  AADHAAR_CARD:           { bg: "rgba(245,158,11,0.07)",  text: "#d97706", border: "rgba(245,158,11,0.2)" },
  BANK_DETAILS:           { bg: "rgba(59,130,246,0.07)",  text: "#2563eb", border: "rgba(59,130,246,0.2)" },
  EDUCATIONAL_CERTIFICATE:{ bg: "rgba(139,92,246,0.07)",  text: "#7c3aed", border: "rgba(139,92,246,0.2)" },
  EXPERIENCE_LETTER:      { bg: "rgba(236,72,153,0.07)",  text: "#be185d", border: "rgba(236,72,153,0.2)" },
  AGREEMENT:              { bg: "rgba(239,68,68,0.07)",   text: "#dc2626", border: "rgba(239,68,68,0.2)" },
  NDA:                    { bg: "rgba(15,23,42,0.07)",    text: "#0f172a", border: "rgba(15,23,42,0.2)" },
  OTHER:                  { bg: "rgba(100,116,139,0.07)", text: "#475569", border: "rgba(100,116,139,0.2)" },
};

const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  data: EmployeeDocumentsPageData;
};

export function EmployeeDocumentsPanel({ data }: Props) {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadEmployeeDocument, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteEmployeeDocument, {});

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* Hero header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">Documents</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {data.canManage && data.targetUserName !== "me"
              ? `${data.targetUserName}'s Documents`
              : "My Documents"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.documents.length} document{data.documents.length !== 1 ? "s" : ""} stored securely.
          </p>
        </div>
      </div>

      {/* Upload form */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">Upload</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Add document</h2>
          <p className="text-sm text-slate-500">Supported formats: PDF, JPG, PNG, DOCX — max 25 MB.</p>
        </div>

        <form action={uploadAction} className="p-6">
          <input type="hidden" name="targetUserId" value={data.targetUserId} />

          {uploadState.error   && <FeedbackBanner tone="error"   className="mb-5">{uploadState.error}</FeedbackBanner>}
          {uploadState.success && <FeedbackBanner tone="success" className="mb-5">{uploadState.success}</FeedbackBanner>}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-700">Document type *</span>
              <select className={INPUT} name="documentType" required>
                <option value="">Select type…</option>
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{DOC_TYPE_ICONS[v]} {l}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-700">File *</span>
              <input
                accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                className="w-full cursor-pointer rounded-md border border-dashed border-violet-300 bg-violet-50/40 px-3 py-2.5 text-sm text-slate-700 outline-none transition hover:bg-violet-50 focus:border-violet-500"
                name="file"
                required
                type="file"
              />
            </label>
          </div>

          <button
            className="mt-6 rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            disabled={uploadPending}
            type="submit"
          >
            {uploadPending ? "Uploading…" : "Upload Document"}
          </button>
        </form>
      </div>

      {/* Documents grid */}
      {deleteState.error   && <FeedbackBanner tone="error">{deleteState.error}</FeedbackBanner>}
      {deleteState.success && <FeedbackBanner tone="success">{deleteState.success}</FeedbackBanner>}

      {data.documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <p className="text-4xl">📁</p>
          <p className="mt-3 font-semibold text-slate-600">No documents uploaded yet</p>
          <p className="mt-1 text-sm text-slate-400">Upload offer letter, Aadhaar, PAN, or any other documents.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              canDelete={data.canManage}
              deleteAction={deleteAction}
              deletePending={deletePending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  canDelete,
  deleteAction,
  deletePending,
}: {
  doc: EmployeeDocumentEntry;
  canDelete: boolean;
  deleteAction: (formData: FormData) => void;
  deletePending: boolean;
}) {
  const color = DOC_COLORS[doc.documentType] ?? DOC_COLORS.OTHER;
  const icon  = DOC_TYPE_ICONS[doc.documentType] ?? "📁";
  const label = DOC_TYPE_LABELS[doc.documentType] ?? "Document";

  const isExpiringSoon = doc.expiryDate
    ? new Date(doc.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false;

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      {/* Top band */}
      <div className="border-b border-slate-200 px-5 py-4" style={{ background: color.bg }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{icon}</span>
            <p className="font-bold text-slate-800" style={{ color: color.text }}>{label}</p>
          </div>
          {isExpiringSoon && doc.expiryDate && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
              Expires soon
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* File name */}
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14" className="shrink-0 text-slate-400">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="min-w-0 flex-1 truncate text-[0.78rem] font-semibold text-slate-700">{doc.fileName}</p>
        </div>

        {/* Meta */}
        <div className="mt-3 space-y-1.5">
          <p className="text-[0.68rem] text-slate-400">Uploaded: {doc.uploadedAt}</p>
          {doc.expiryDate && <p className="text-[0.68rem] text-slate-400">Expires: {doc.expiryDate}</p>}
          {doc.note && <p className="text-[0.72rem] text-slate-500 italic">{doc.note}</p>}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <a
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white py-2 text-[0.78rem] font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            download
            href={doc.fileUrl}
            rel="noreferrer"
            target="_blank"
          >
            <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download
          </a>

          {canDelete && (
            <form action={deleteAction}>
              <input type="hidden" name="documentId" value={doc.id} />
              <button
                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[0.78rem] font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                disabled={deletePending}
                type="submit"
                onClick={(e) => { if (!confirm("Delete this document?")) e.preventDefault(); }}
              >
                🗑
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function FeedbackBanner({ tone, children, className }: { tone: "error" | "success"; children: React.ReactNode; className?: string }) {
  const cfg = tone === "error"
    ? { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", text: "#dc2626" }
    : { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", text: "#059669" };
  return (
    <div className={`rounded-md border px-4 py-3 text-sm font-medium ${className ?? ""}`} style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}>
      {children}
    </div>
  );
}
