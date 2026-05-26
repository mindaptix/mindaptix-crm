"use client";

import type { ReactNode } from "react";
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutUser } from "@/features/auth/actions";
import { subscribeDashboardSync } from "@/features/dashboard/lib/live-sync";
import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import {
  getDashboardNavItemsForRole,
  getDisplayRoleLabel,
  type DashboardNavItem,
  type DashboardNavKey,
} from "@/features/dashboard/config";

type DashboardShellProps = {
  children: ReactNode;
  session: AuthenticatedSession;
};

export function DashboardShell({ children, session }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const hasHydrated = useSyncExternalStore(subscribeToHydration, getClientHydrationSnapshot, getServerHydrationSnapshot);
  const navItems = useMemo(() => getDashboardNavItemsForRole(session.user.role), [session.user.role]);
  const lastRefreshAt = useRef(0);
  const routerRef = useRef(router);
  useLayoutEffect(() => {
    routerRef.current = router;
  });
  const desktopSidebarClasses =
    "lg:sticky lg:top-0 lg:h-screen lg:self-start lg:translate-x-0 lg:overflow-hidden lg:rounded-none lg:border-r lg:border-slate-800/50 lg:shadow-none";
  const activePathname = hasHydrated ? pathname : "";
  const showSidebarOverlay = hasHydrated && isSidebarOpen;
  const refreshDashboardView = useCallback((force = false) => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    const tagName = activeElement?.tagName?.toLowerCase();
    const isEditing =
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      activeElement?.isContentEditable === true;

    if (isEditing) {
      return;
    }

    const now = Date.now();
    if (!force && now - lastRefreshAt.current < 1800) {
      return;
    }

    lastRefreshAt.current = now;

    startTransition(() => {
      routerRef.current.refresh();
    });
  }, []);

  useEffect(() => {
    const handleWindowFocus = () => {
      refreshDashboardView();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshDashboardView();
      }
    };

    const unsubscribeDashboardSync = subscribeDashboardSync(() => {
      refreshDashboardView(true);
    });

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribeDashboardSync();
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshDashboardView]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-900 lg:h-screen lg:overflow-hidden">
      <div className="relative mx-auto flex min-h-screen max-w-[1680px] gap-4 px-3 py-3 lg:h-screen lg:max-w-none lg:gap-0 lg:px-0 lg:py-0">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[308px] flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#061227_0%,#0b1730_30%,#0b2040_68%,#0a4e87_100%)] px-4 py-4 text-white shadow-[28px_0_80px_rgba(2,6,23,0.3)] transition duration-300 lg:w-[320px] lg:px-5 lg:py-5 ${desktopSidebarClasses} ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="shrink-0 rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,28,53,0.98)_0%,rgba(10,54,94,0.94)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_36px_rgba(2,12,27,0.24)]">
            <div className="flex items-center gap-3">
              <div className="overflow-hidden rounded-[1rem] shadow-[0_16px_32px_rgba(16,185,129,0.28)]">
                <Image alt="Dashboard icon" className="h-12 w-12 object-cover" height={48} src="/3.png" width={48} />
              </div>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-cyan-100/68">Workspace</p>
                <h2 className="truncate text-xl font-semibold text-white">Mindaptix CRM</h2>
              </div>
            </div>
          </div>

          <nav className="mt-4 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {NAV_GROUPS.map((group) => {
              const groupItems = navItems.filter((item) => group.keys.includes(item.key));
              if (groupItems.length === 0) return null;
              return (
                <div key={group.label ?? "main"} className="mb-2">
                  {group.label ? (
                    <p className="mb-1 mt-3 px-3 text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/30">
                      {group.label}
                    </p>
                  ) : null}
                  <div className="space-y-0.5">
                    {groupItems.map((item) => {
                      const active = isItemActive(activePathname, item);
                      const itemLabel = session.user.role === "SALES" && item.key === "employees" ? "Leads" : item.label;
                      return (
                        <Link
                          className={`group flex w-full items-center gap-3 rounded-[1.2rem] px-3 py-2.5 transition-all duration-150 ${
                            active
                              ? "bg-white text-slate-900 shadow-[0_8px_24px_rgba(255,255,255,0.12)]"
                              : "text-slate-200/92 hover:bg-white/10 hover:text-white"
                          }`}
                          href={item.href}
                          key={item.key}
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[0.85rem] border transition-all duration-150 ${
                              active
                                ? "border-blue-100 bg-blue-50 text-blue-600"
                                : "border-white/10 bg-white/6 text-white/80 group-hover:border-white/20 group-hover:bg-white/12 group-hover:text-white"
                            }`}
                          >
                            {getMenuIcon(item.key)}
                          </span>
                          <span className={`truncate text-[0.95rem] font-semibold tracking-[-0.01em] ${active ? "text-slate-900" : "text-slate-100/90"}`}>
                            {itemLabel}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-3 shrink-0 overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,35,65,0.95)_0%,rgba(10,50,90,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_-8px_24px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3 px-3.5 pt-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-[linear-gradient(135deg,#1d4ed8,#0f172a)] text-sm font-bold text-white shadow-[0_8px_20px_rgba(29,78,216,0.4)]">
                {session.user.fullName.trim().split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{session.user.fullName}</p>
                <p className="mt-0.5 truncate text-xs text-blue-200/70">{getDisplayRoleLabel(session.user.role)}</p>
              </div>
            </div>
            <p className="mt-2 break-all px-3.5 text-[0.68rem] text-blue-100/50">{session.user.email}</p>
            <div className="mt-3 border-t border-white/8 px-3 pb-3 pt-2.5">
              <form action={logoutUser}>
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-[0.95rem] border border-white/12 bg-white/6 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/12 hover:text-white"
                  type="submit"
                >
                  <LogoutIcon />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </aside>

        {showSidebarOverlay ? (
          <button
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          />
        ) : null}

        <section className="relative z-10 flex min-w-0 flex-1 flex-col px-1 py-1 lg:h-screen lg:overflow-y-auto lg:px-4 lg:py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] lg:min-h-[calc(100dvh-2rem)]">
            <header className="border-b border-slate-100 px-5 py-3 sm:px-7">
              <div className="flex items-center gap-3">
                <button
                  aria-label="Open sidebar"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.9rem] border border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.07)] lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                  type="button"
                >
                  <HamburgerIcon />
                </button>
                <div className="min-w-0 flex-1">
                  <ActivePageTitle navItems={navItems} pathname={activePathname} role={session.user.role} />
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  <TodayBadge />
                </div>
              </div>
            </header>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function ActivePageTitle({
  navItems,
  pathname,
  role,
}: {
  navItems: DashboardNavItem[];
  pathname: string;
  role: string;
}) {
  const active = navItems.find((item) => isItemActive(pathname, item));
  if (!active) return null;

  const label = role === "SALES" && active.key === "employees" ? "Leads" : active.label;
  const icon = getMenuIcon(active.key);

  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.7rem] border border-blue-100 bg-blue-50 text-blue-600">
        {icon}
      </span>
      <span className="text-base font-semibold text-slate-900">{label}</span>
    </div>
  );
}

function TodayBadge() {
  const today = new Date();
  const label = today.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
      {label}
    </span>
  );
}

function subscribeToHydration() {
  return () => {};
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

const NAV_GROUPS: { label: string | null; keys: DashboardNavKey[] }[] = [
  { label: null, keys: ["dashboard"] },
  { label: "People", keys: ["employees", "attendance", "leaves"] },
  { label: "Work", keys: ["projects", "tasks", "dsr"] },
  { label: "Finance", keys: ["reports", "payroll", "expenses"] },
  { label: "Communication", keys: ["announcements"] },
  { label: "Account", keys: ["settings"] },
];

function isItemActive(pathname: string, item: DashboardNavItem) {
  if (item.href === "/dashboard") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getMenuIcon(key: DashboardNavKey) {
  switch (key) {
    case "dashboard":
      return <GridIcon />;
    case "employees":
      return <UsersIcon />;
    case "projects":
      return <FolderIcon />;
    case "attendance":
      return <CalendarIcon />;
    case "leaves":
      return <DocumentIcon />;
    case "tasks":
      return <BriefcaseIcon />;
    case "dsr":
      return <ReportIcon />;
    case "reports":
      return <ChartIcon />;
    case "payroll":
      return <PayrollIcon />;
    case "expenses":
      return <ExpenseIcon />;
    case "announcements":
      return <MegaphoneIcon />;
    case "settings":
      return <SettingsIcon />;
  }
}

function HamburgerIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m10 17 5-5-5-5M15 12H3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <rect height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="6.5" x="3.5" y="3.5" />
      <rect height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="6.5" x="14" y="3.5" />
      <rect height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="6.5" x="3.5" y="14" />
      <rect height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="6.5" x="14" y="14" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16" cy="8" r="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.2 18c.8-2.1 2.5-3.3 4.7-3.3 2.1 0 4 1.1 4.9 3.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="M14.2 17.5c.5-1.4 1.6-2.2 3-2.2 1.2 0 2.1.5 2.8 1.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <rect height="15" rx="2.2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="5.5" />
      <path d="M7.5 3.5v4M16.5 3.5v4M3 10h18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="m9.5 15 1.5 1.5 3.5-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M8 3.5h6l4 4V20a.5.5 0 0 1-.5.5h-9A3.5 3.5 0 0 1 5 17V7A3.5 3.5 0 0 1 8.5 3.5H8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M10 11.5h6M10 15.5h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M8 6.5V5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5v1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect height="13" rx="2.2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="6.5" />
      <path d="M3 11.5h18" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 11.5v2h4v-2" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l1.6 1.8c.3.4.7.7 1.2.7H18A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17v-9.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v12A1.5 1.5 0 0 1 17 19.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 9.5h7M8.5 13h7M8.5 16.5H13" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M5 18.5V10.5M10 18.5V6.5M15 18.5V12.5M20 18.5V4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="m4.5 8.5 4-3 4 2.5 6-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm7.2 3.5.8 1.4-1.8 3.1-1.7-.2a6.8 6.8 0 0 1-1.2.7l-.7 1.6H9.4l-.7-1.6a6.8 6.8 0 0 1-1.2-.7l-1.7.2L4 13.4l.8-1.4a7.4 7.4 0 0 1 0-1.9L4 8.6l1.8-3.1 1.7.2a6.8 6.8 0 0 1 1.2-.7l.7-1.6h5.2l.7 1.6a6.8 6.8 0 0 1 1.2.7l1.7-.2L20 8.6l-.8 1.5a7.4 7.4 0 0 1 0 1.9Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function PayrollIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <rect height="14" rx="2.2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="5" />
      <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 13.5h3M14 13.5h3M7 16.5h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <circle cx="17" cy="16.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v13l-3-2-2 2-2-2-2 2-3-2V5.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M9 9h6M9 12.5h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M19 8.5c.8.5 1.5 1.4 1.5 3s-.7 2.5-1.5 3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="M4.5 8.5h3l7-4v15l-7-4h-3a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 4.5 8.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M7.5 16.5v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}




