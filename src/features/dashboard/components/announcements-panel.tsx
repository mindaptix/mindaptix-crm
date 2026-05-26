"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { createAnnouncement, deleteAnnouncement, togglePinAnnouncement } from "@/features/dashboard/actions/announcements";
import { Feedback } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";
import type { AnnouncementEntry, AnnouncementsPageData } from "@/features/dashboard/types";

type AnnouncementsPanelProps = {
  data: AnnouncementsPageData;
};

const ANNOUNCEMENT_TYPES = ["GENERAL", "URGENT", "POLICY", "EVENT", "HOLIDAY"];
const TYPE_COLORS: Record<string, string> = {
  EVENT: "bg-emerald-100 text-emerald-700",
  GENERAL: "bg-blue-100 text-blue-700",
  HOLIDAY: "bg-amber-100 text-amber-700",
  POLICY: "bg-violet-100 text-violet-700",
  URGENT: "bg-red-100 text-red-700",
};
const INIT = { error: undefined, success: undefined };

export function AnnouncementsPanel({ data }: AnnouncementsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [createState, createAction, createPending] = useActionState(createAnnouncement, INIT);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAnnouncement, INIT);
  const [pinState, pinAction] = useActionState(togglePinAnnouncement, INIT);

  const pinned = data.announcements.filter((announcement) => announcement.isPinned);
  const regular = data.announcements.filter((announcement) => !announcement.isPinned);

  return (
    <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
      <section className="overflow-hidden rounded-[2rem] border border-amber-100 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_52%,#f8fafc_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-amber-600">Company</p>
            <h2 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-950">Announcements</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Company-wide notices, policy updates, and event announcements.
            </p>
          </div>
          {data.canManage ? (
            <Button className="shrink-0 sm:w-auto" onClick={() => setShowForm((value) => !value)}>
              {showForm ? "Cancel" : "+ Post Announcement"}
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <AnnouncementMetric label="Total" value={String(data.announcements.length)} />
          <AnnouncementMetric label="Pinned" tone="amber" value={String(pinned.length)} />
          <AnnouncementMetric label="Active Stream" tone="blue" value={String(regular.length)} />
        </div>
      </section>

      {showForm && data.canManage ? (
        <section className="rounded-[1.8rem] border border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_100%)] p-5 shadow-[0_16px_36px_rgba(180,83,9,0.08)] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] border border-amber-200 bg-amber-50 text-amber-700">
              <MegaphoneIcon />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-amber-600">New Notice</p>
              <h3 className="text-base font-semibold text-slate-950">Post Announcement</h3>
            </div>
          </div>

          <form action={createAction} className="space-y-4">
            {createState.error ? <Feedback>{createState.error}</Feedback> : null}
            {createState.success ? <Feedback tone="success">{createState.success}</Feedback> : null}
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <FieldShell label="Title">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                  name="title"
                  placeholder="Announcement title"
                  required
                />
              </FieldShell>
              <FieldShell label="Type">
                <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100" name="type">
                  {ANNOUNCEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </FieldShell>
            </div>
            <FieldShell label="Body">
              <textarea
                className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                name="body"
                placeholder="Write the full announcement here"
                required
              />
            </FieldShell>
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input className="h-4 w-4 rounded border-slate-300 text-amber-600" name="isPinned" type="checkbox" value="true" />
                Pin this announcement
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:flex-row sm:items-center sm:gap-2">
                <span>Expires on</span>
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none [color-scheme:light] focus:border-amber-300" name="expiresAt" type="date" />
              </label>
            </div>
            <Button className="sm:w-auto" disabled={createPending} type="submit">
              {createPending ? "Posting..." : "Post Announcement"}
            </Button>
          </form>
        </section>
      ) : null}

      {deleteState.error ? <Feedback>{deleteState.error}</Feedback> : null}
      {deleteState.success ? <Feedback tone="success">{deleteState.success}</Feedback> : null}
      {pinState.error ? <Feedback>{pinState.error}</Feedback> : null}
      {pinState.success ? <Feedback tone="success">{pinState.success}</Feedback> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Pinned</p>
          <div className="space-y-3">
            {pinned.length > 0 ? (
              pinned.map((announcement) => (
                <AnnouncementCard
                  announcement={announcement}
                  canManage={data.canManage}
                  deleteAction={deleteAction}
                  deletePending={deletePending}
                  key={announcement.id}
                  pinAction={pinAction}
                />
              ))
            ) : (
              <EmptyState message="No pinned announcements yet." />
            )}
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">All Announcements</p>
          <div className="space-y-3">
            {regular.length > 0 ? (
              regular.map((announcement) => (
                <AnnouncementCard
                  announcement={announcement}
                  canManage={data.canManage}
                  deleteAction={deleteAction}
                  deletePending={deletePending}
                  key={announcement.id}
                  pinAction={pinAction}
                />
              ))
            ) : (
              <EmptyState message={data.announcements.length === 0 ? "No announcements yet." : "No regular announcements."} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AnnouncementCard({
  announcement,
  canManage,
  deleteAction,
  deletePending,
  pinAction,
}: {
  announcement: AnnouncementEntry;
  canManage: boolean;
  deleteAction: (fd: FormData) => void;
  deletePending: boolean;
  pinAction: (fd: FormData) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <article className={`rounded-[1.5rem] border bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] ${announcement.isPinned ? "border-amber-200 ring-4 ring-amber-50" : "border-slate-200/80"}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {announcement.isPinned ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-amber-700">Pinned</span>
            ) : null}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[announcement.type] ?? "bg-slate-100 text-slate-500"}`}>
              {announcement.type}
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-950">{announcement.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{announcement.body}</p>
          <p className="mt-2 text-xs text-slate-400">
            By {announcement.createdByName} - {announcement.createdAt}
            {announcement.expiresAt ? ` - Expires ${announcement.expiresAt}` : ""}
          </p>
        </div>

        {canManage ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <form action={pinAction}>
              <input name="announcementId" type="hidden" value={announcement.id} />
              <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700" type="submit">
                {announcement.isPinned ? "Unpin" : "Pin"}
              </button>
            </form>
            {confirmDelete ? (
              <form action={deleteAction} className="flex items-center gap-1">
                <input name="announcementId" type="hidden" value={announcement.id} />
                <button className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700" disabled={deletePending} type="submit">
                  Confirm
                </button>
                <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500" onClick={() => setConfirmDelete(false)} type="button">
                  Cancel
                </button>
              </form>
            ) : (
              <button className="rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AnnouncementMetric({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "amber" | "blue" }) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-white text-slate-700",
  }[tone];

  return (
    <div className={`rounded-[1.2rem] border px-4 py-3 ${toneClass}`}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function FieldShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function MegaphoneIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M19 8.5c.8.5 1.5 1.4 1.5 3s-.7 2.5-1.5 3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="M4.5 8.5h3l7-4v15l-7-4h-3A1.5 1.5 0 0 1 3 14v-4a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M7.5 16.5v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}
