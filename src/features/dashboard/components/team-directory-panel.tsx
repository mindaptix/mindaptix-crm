"use client";

import { useState } from "react";
import type { EmployeeDirectoryEntry } from "@/features/dashboard/types";

function initials(name: string) {
  return name.trim().split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const AVATAR_GRADS = [
  "linear-gradient(135deg,#6366f1,#818cf8)",
  "linear-gradient(135deg,#10b981,#34d399)",
  "linear-gradient(135deg,#f59e0b,#fbbf24)",
  "linear-gradient(135deg,#ec4899,#f472b6)",
  "linear-gradient(135deg,#3b82f6,#60a5fa)",
  "linear-gradient(135deg,#8b5cf6,#a78bfa)",
];

function avatarGrad(name: string) {
  return AVATAR_GRADS[name.charCodeAt(0) % AVATAR_GRADS.length];
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Present" || status === "Present + Checkout") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-bold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Present
      </span>
    );
  }
  if (status === "On Leave") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.65rem] font-bold text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        On Leave
      </span>
    );
  }
  if (status === "Admin" || status === "Sales") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.65rem] font-bold text-slate-500">
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[0.65rem] font-bold text-rose-500">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      Not Marked
    </span>
  );
}

type Props = {
  users: EmployeeDirectoryEntry[];
};

export function TeamDirectoryPanel({ users }: Props) {
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [u.fullName, u.designation, u.department, u.role, ...u.techStack]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const totalEmployees = users.length;
  const presentToday = users.filter((u) => u.todayStatus === "Present" || u.todayStatus === "Present + Checkout").length;
  const notMarked = users.filter((u) => u.todayStatus === "Not Marked").length;
  const onLeave = users.filter((u) => u.todayStatus === "On Leave").length;

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">

      {/* Header */}
      <div
        className="overflow-hidden rounded-[1.8rem]"
        style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 60%,#2563eb 100%)", boxShadow: "0 12px 40px rgba(29,78,216,0.35)" }}
      >
        <div className="px-6 py-6 sm:px-8">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-blue-200">Company Directory</p>
          <h1 className="mt-1.5 text-2xl font-black text-white">Team Members</h1>
          <p className="mt-1 text-[0.78rem] text-blue-200">Apni company ke saare employees, unka tech stack aur aaj ki attendance.</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
          {[
            { label: "Total Employees", value: totalEmployees, color: "text-white" },
            { label: "Present Today", value: presentToday, color: "text-emerald-300" },
            { label: "On Leave", value: onLeave, color: "text-amber-300" },
            { label: "Not Marked", value: notMarked, color: "text-rose-300" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 px-5 py-4">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="mt-0.5 text-[0.65rem] font-semibold text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="border-t border-white/10 bg-white/5 px-5 py-3 sm:px-8">
          <div className="relative flex items-center">
            <svg className="pointer-events-none absolute left-3.5 text-white/40" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30 focus:bg-white/15"
              placeholder="Search by name, tech stack, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-[1.8rem]"
        style={{ border: "1px solid rgba(226,232,240,0.8)", background: "#fff", boxShadow: "0 8px 40px rgba(15,23,42,0.07)" }}
      >
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">Koi employee nahi mila is search ke liye.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ background: "linear-gradient(135deg,#f8faff,#eef4ff)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
                  <th className="px-5 py-3.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#6366f1" }}>Employee</th>
                  <th className="px-5 py-3.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#6366f1" }}>Designation</th>
                  <th className="px-5 py-3.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#6366f1" }}>Tech Stack</th>
                  <th className="px-5 py-3.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.26em]" style={{ color: "#6366f1" }}>Aaj Ki Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/60">
                    {/* Name + avatar */}
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-bold text-white"
                          style={{ background: avatarGrad(user.fullName) }}
                        >
                          {initials(user.fullName)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{user.fullName}</p>
                          <p className="text-[0.65rem] text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Designation / Dept */}
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="text-sm text-slate-700">{user.designation || "—"}</p>
                      {user.department ? (
                        <p className="text-[0.65rem] text-slate-400">{user.department}</p>
                      ) : null}
                    </td>

                    {/* Tech Stack */}
                    <td className="px-5 py-3.5">
                      {user.techStack.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {user.techStack.slice(0, 4).map((tech) => (
                            <span
                              key={tech}
                              className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[0.62rem] font-semibold text-indigo-700"
                            >
                              {tech}
                            </span>
                          ))}
                          {user.techStack.length > 4 ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[0.62rem] font-semibold text-slate-500">
                              +{user.techStack.length - 4} more
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[0.72rem] text-slate-300">—</span>
                      )}
                    </td>

                    {/* Today's status */}
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <StatusBadge status={user.todayStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-50 px-5 py-3">
          <p className="text-[0.65rem] text-slate-400">{filtered.length} of {users.length} employees shown</p>
        </div>
      </div>
    </div>
  );
}
