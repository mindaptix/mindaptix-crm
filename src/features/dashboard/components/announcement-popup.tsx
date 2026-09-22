"use client";

import { useEffect, useState } from "react";

type PopupAnnouncement = {
  id: string;
  title: string;
  body: string;
  type: string;
  expiresAt: string;
};

export function AnnouncementPopup({ announcements, dateKey, userId }: { announcements: PopupAnnouncement[]; dateKey: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const storageKey = `mindaptix:announcement-popup:${userId}:${dateKey}`;

  useEffect(() => {
    try {
      setOpen(announcements.length > 0 && window.localStorage.getItem(storageKey) !== "dismissed");
    } catch {
      setOpen(announcements.length > 0);
    }
  }, [announcements.length, storageKey]);

  function close() {
    try { window.localStorage.setItem(storageKey, "dismissed"); } catch { /* private browsing can block storage */ }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" role="dialog" aria-labelledby="announcement-popup-title">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_72px_rgba(15,23,42,0.28)]">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
            <MegaphoneIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Company announcement</p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900" id="announcement-popup-title">Updates for today</h2>
          </div>
          <button aria-label="Close announcements" className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={close} type="button"><CloseIcon /></button>
        </div>
        <div className="max-h-[55vh] space-y-3 overflow-y-auto px-5 py-4">
          {announcements.map((announcement) => (
            <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4" key={announcement.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${toneFor(announcement.type)}`}>{announcement.type}</span>
                {announcement.expiresAt ? <span className="text-xs text-slate-500">Active through {formatDate(announcement.expiresAt)}</span> : null}
              </div>
              <h3 className="mt-2 text-sm font-semibold text-slate-900">{announcement.title}</h3>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{announcement.body}</p>
            </article>
          ))}
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4">
          <button className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700" onClick={close} type="button">Got it</button>
        </div>
      </section>
    </div>
  );
}

function toneFor(type: string) {
  if (type === "URGENT") return "bg-red-100 text-red-700";
  if (type === "POLICY") return "bg-violet-100 text-violet-700";
  if (type === "EVENT") return "bg-blue-100 text-blue-700";
  if (type === "HOLIDAY") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-200 text-slate-700";
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function MegaphoneIcon() {
  return <svg fill="none" height="19" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="19"><path d="m3 11 17-5v12L3 13v-2Z" strokeLinejoin="round" /><path d="M7 14v4a2 2 0 0 0 2 2h1l1-5" strokeLinecap="round" /><path d="M20 10h1a2 2 0 0 1 0 4h-1" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>;
}
