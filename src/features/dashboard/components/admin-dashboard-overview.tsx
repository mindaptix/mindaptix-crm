"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ClientPaymentsPanel } from "@/features/dashboard/components/client-payments-panel";
import { useActionState, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AttendanceTrendPoint,
  CalendarEventItem,
  DashboardBreakdownSlice,
  DashboardListItem,
  DashboardNotificationItem,
  DsrTrendPoint,
  EmployeeProjectSummaryRow,
  ExecutiveOverviewSection,
  LeaveTrendPoint,
  PaymentsPageData,
  PerformanceScoreRow,
  SummaryCard,
  UnreadAssignment,
} from "@/features/dashboard/types";
import { createClientMeeting, type ClientMeetingFormState } from "@/features/dashboard/actions/client-meetings";
import { createSalesLead, type SalesLeadFormState } from "@/features/dashboard/actions/sales-leads";
import { AssignmentAlertBanner } from "@/features/dashboard/components/assignment-alert-banner";
import { DashboardFilterBar } from "@/features/dashboard/components/dashboard-filter-bar";

const INLINE_PITCH_INITIAL_STATE: SalesLeadFormState = {};
const INLINE_PITCH_SOURCES = ["Website", "Referral", "Facebook", "Instagram", "LinkedIn", "WhatsApp", "Call", "Walk-in", "Campaign", "Other"];
const INLINE_PITCH_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];
const INLINE_PITCH_PRIORITIES = ["HOT", "WARM", "COLD"];
const INLINE_PITCH_SERVICES = ["Custom Website", "WordPress", "Shopify", "SEO", "Google Ads", "Meta Ads", "AI Chatbot", "Custom CRM", "React Native", "UI/UX Design"];

type AdminDashboardOverviewProps = {
  paymentsData?: PaymentsPageData;
  attendanceBreakdown?: DashboardBreakdownSlice[];
  attendanceTrend?: AttendanceTrendPoint[];
  calendarItems?: CalendarEventItem[];
  calendarTitle?: string;
  description: string;
  directoryEmptyMessage?: string;
  directoryItems?: DashboardListItem[];
  directoryTitle?: string;
  dsrTrend?: DsrTrendPoint[];
  employeeProjectRows?: EmployeeProjectSummaryRow[];
  executiveSections?: ExecutiveOverviewSection[];
  filterDate?: string;
  filterLabel?: string;
  filterMonth?: string;
  financeNote?: string;
  leaveTrend?: LeaveTrendPoint[];
  notificationTitle?: string;
  notifications?: DashboardNotificationItem[];
  performanceRows?: PerformanceScoreRow[];
  performanceTitle?: string;
  primaryEmptyMessage: string;
  primaryItems: DashboardListItem[];
  primaryListTitle: string;
  projectStatusBreakdown?: DashboardBreakdownSlice[];
  roleBadge?: string;
  secondaryEmptyMessage: string;
  secondaryItems: DashboardListItem[];
  secondaryListTitle: string;
  taskStatusBreakdown?: DashboardBreakdownSlice[];
  title: string;
  unreadAssignments?: UnreadAssignment[];
  weeklySummaryCards?: SummaryCard[];
  weeklySummaryTitle?: string;
};

export function AdminDashboardOverview({
  paymentsData,
  attendanceBreakdown,
  attendanceTrend,
  calendarItems,
  calendarTitle,
  directoryEmptyMessage,
  directoryItems,
  directoryTitle,
  dsrTrend,
  employeeProjectRows,
  executiveSections,
  filterDate,
  filterLabel,
  filterMonth,
  leaveTrend,
  notificationTitle,
  notifications,
  performanceRows,
  performanceTitle,
  primaryEmptyMessage,
  primaryItems,
  primaryListTitle,
  projectStatusBreakdown,
  roleBadge,
  secondaryEmptyMessage,
  secondaryItems,
  secondaryListTitle,
  taskStatusBreakdown,
  unreadAssignments,
  weeklySummaryCards,
  weeklySummaryTitle,
}: AdminDashboardOverviewProps) {
  const showExecutiveCharts =
    Boolean(attendanceBreakdown?.length) ||
    Boolean(attendanceTrend?.length) ||
    Boolean(taskStatusBreakdown?.length) ||
    Boolean(projectStatusBreakdown?.length) ||
    Boolean(leaveTrend?.length) ||
    Boolean(dsrTrend?.length);
  const [activeExecutiveSectionId, setActiveExecutiveSectionId] = useState(executiveSections?.[0]?.id ?? "");
  const activeExecutiveSection = executiveSections?.find((section) => section.id === activeExecutiveSectionId) ?? executiveSections?.[0];
  const [isAssignmentBannerOpen, setIsAssignmentBannerOpen] = useState(Boolean(unreadAssignments?.length));

  return (
    <div className="space-y-4 px-3 pb-4 pt-1 sm:px-7 sm:pb-6 sm:pt-1">
      <DashboardFilterBar
        contextLabel={activeExecutiveSection?.title}
        filterDate={filterDate}
        filterLabel={filterLabel}
        filterMonth={filterMonth}
      />

      {/* Assignment notification banner — auto-opens when admin/super-admin has unread assignments */}
      {isAssignmentBannerOpen && unreadAssignments && unreadAssignments.length > 0 && (
        <AssignmentAlertBanner
          assignments={unreadAssignments}
          onDismiss={() => setIsAssignmentBannerOpen(false)}
        />
      )}

      {executiveSections?.length ? (
        <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,#eff6ff_0%,#ffffff_42%,#f8fafc_100%)] p-2 shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:rounded-[2.2rem] sm:p-4">
          <div className="rounded-[1.3rem] border border-white/70 bg-white/75 p-3 backdrop-blur sm:rounded-[1.8rem] sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Executive Summary</p>
                <h3 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-slate-950">Leadership Control Boxes</h3>
              </div>
              <div className="rounded-full border border-blue-200 bg-white px-5 py-2.5 text-[0.78rem] font-bold uppercase tracking-[0.24em] text-blue-700 shadow-[0_10px_26px_rgba(37,99,235,0.08)]">
                {roleBadge ? `${roleBadge} View` : "Leadership View"}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {executiveSections.map((section) => {
              const isActive = section.id === activeExecutiveSection?.id;
              const leadMetric = section.metrics[0];
              const supportMetric = section.metrics[1];
              const accent = getExecutiveSectionAccent(section.id, isActive);
              const cardClassName = `group relative shrink-0 w-[220px] overflow-hidden rounded-[1.7rem] border p-4 text-left transition duration-200 ${accent.card}`;
              const cardContent = (
                <>
                  <div className={`absolute inset-x-0 top-0 h-1.5 ${accent.bar}`} />
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-[0.72rem] font-semibold uppercase tracking-[0.24em] ${accent.eyebrow}`}>{section.badge}</p>
                  </div>
                  <h4 className={`mt-4 text-[1.15rem] font-semibold tracking-tight ${accent.title}`}>{section.title}</h4>
                  <div className="mt-2 grid gap-2 sm:mt-3">
                    <div className={`rounded-[1.2rem] border px-4 py-3 ${accent.metricShell}`}>
                      <p className={`text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${accent.metricLabel}`}>{leadMetric?.label ?? "Overview"}</p>
                      <p className={`mt-1.5 truncate text-[1.6rem] font-semibold leading-none ${accent.metricValue}`}>{leadMetric?.value ?? "-"}</p>
                      {supportMetric ? (
                        <div className={`mt-3 border-t pt-2.5 ${accent.metricDivider}`}>
                          <p className={`text-[0.6rem] uppercase tracking-[0.16em] ${accent.metricHint}`}>{supportMetric.label}</p>
                          <p className={`mt-0.5 truncate text-[0.9rem] font-semibold ${accent.metricValue}`}>{supportMetric.value}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              );

              return (
                <button
                  className={cardClassName}
                  key={section.id}
                  onClick={() => setActiveExecutiveSectionId(section.id)}
                  type="button"
                >
                  {cardContent}
                </button>
              );
            })}
          </div>

          {activeExecutiveSection ? (
            <div className="mt-4">
              <FilterContextNote filterDate={filterDate} filterLabel={filterLabel} filterMonth={filterMonth} sectionTitle={activeExecutiveSection.title} />
              {activeExecutiveSection.id === "payments" && paymentsData ? (
                <div className="-mx-5">
                  <ClientPaymentsPanel data={paymentsData} inline />
                </div>
              ) : (
                <ExecutiveSectionPanel section={activeExecutiveSection} />
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {executiveSections?.length && activeExecutiveSection ? (
        <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">Operational Snapshot</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{activeExecutiveSection.title} Insights</h3>
            </div>
          </div>

          <div className="mt-5">
            {activeExecutiveSection.id === "workforce" ? (
              <div className="grid gap-5 xl:items-start xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.85fr)_minmax(320px,0.85fr)]">
                <ChartPanel description="Daily employee movement for the last 7 days." title="Attendance Overview">
                  {attendanceTrend?.length ? (
                    <div className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-3">
                      <ResponsiveContainer height={248} width="100%">
                        <BarChart data={attendanceTrend}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} stroke="#64748b" tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="present" fill="#2563eb" name="Present" radius={[10, 10, 0, 0]} />
                          <Bar dataKey="onLeave" fill="#f59e0b" name="On Leave" radius={[10, 10, 0, 0]} />
                          <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState message="Attendance chart data is not available yet." />
                  )}
                </ChartPanel>

                <BreakdownPanel data={attendanceBreakdown ?? []} title="Present vs Absent" />
                <MetricBarPanel metrics={activeExecutiveSection.metrics} sectionId={activeExecutiveSection.id} title="Workforce Summary" />
              </div>
            ) : activeExecutiveSection.id === "projects" ? (
              <div className="grid gap-5 xl:items-start xl:grid-cols-[minmax(320px,0.9fr)_minmax(320px,0.9fr)_minmax(320px,0.9fr)]">
                <BreakdownPanel data={projectStatusBreakdown ?? []} title="Project Status" />
                <BreakdownPanel data={taskStatusBreakdown ?? []} title="Task Status" />
                <MetricBarPanel metrics={activeExecutiveSection.metrics} sectionId={activeExecutiveSection.id} title="Portfolio Snapshot" />
              </div>
            ) : (
              <div className="grid gap-5 xl:items-start xl:grid-cols-[minmax(320px,1fr)_minmax(320px,0.9fr)_minmax(320px,0.85fr)]">
                <MetricBarPanel metrics={activeExecutiveSection.metrics} sectionId={activeExecutiveSection.id} title={`${activeExecutiveSection.title} Metrics`} />
                <MetricBreakdownPanel metrics={activeExecutiveSection.metrics} sectionId={activeExecutiveSection.id} title="Breakdown Mix" />
                <ExecutiveQuickPanel section={activeExecutiveSection} />
              </div>
            )}
          </div>
        </section>
      ) : showExecutiveCharts ? (
        <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">Operational Snapshot</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Charts And Graphs</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Attendance, tasks, projects, leave, and DSR movement are grouped here for faster review.
              </p>
            </div>
            <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Live Overview
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <section className="grid gap-5 xl:items-start xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)_minmax(320px,0.8fr)]">
            <ChartPanel description="Daily employee movement for the last 7 days." title="Attendance Overview">
              {attendanceTrend?.length ? (
                <div className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-3">
                  <ResponsiveContainer height={248} width="100%">
                    <BarChart data={attendanceTrend}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} stroke="#64748b" tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="#2563eb" name="Present" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="onLeave" fill="#f59e0b" name="On Leave" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message="Attendance chart data is not available yet." />
              )}
            </ChartPanel>

            <BreakdownPanel data={attendanceBreakdown ?? []} title="Present vs Absent" />
            <BreakdownPanel data={taskStatusBreakdown ?? []} title="Task Status" />
            </section>

            <section className="grid gap-5 xl:items-start xl:grid-cols-[minmax(320px,0.9fr)_minmax(320px,0.9fr)_minmax(320px,0.9fr)]">
            <BreakdownPanel data={projectStatusBreakdown ?? []} title="Project Status" />

            <ChartPanel description="Monthly leave request trend for planning capacity." title="Leave Trend">
              {leaveTrend?.length ? (
                <div className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-3">
                  <ResponsiveContainer height={230} width="100%">
                    <LineChart data={leaveTrend}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} stroke="#64748b" tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Line dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} type="monotone" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message="Leave trend data is not available yet." />
              )}
            </ChartPanel>

            <ChartPanel description="Daily DSR discipline for the last 7 days." title="DSR Submission Rate">
              {dsrTrend?.length ? (
                <div className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-3">
                  <ResponsiveContainer height={230} width="100%">
                    <AreaChart data={dsrTrend}>
                      <defs>
                        <linearGradient id="submittedGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} stroke="#64748b" tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Area dataKey="submitted" fill="url(#submittedGradient)" name="Submitted" stroke="#2563eb" strokeWidth={3} type="monotone" />
                      <Line dataKey="missing" name="Missing" stroke="#ef4444" strokeWidth={3} type="monotone" dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message="DSR trend data is not available yet." />
              )}
            </ChartPanel>
            </section>
          </div>
        </section>
      ) : null}

      {!executiveSections?.length && employeeProjectRows?.length ? <EmployeeProjectPanel rows={employeeProjectRows} /> : null}

      {!executiveSections?.length ? (
        <section className="grid gap-6 md:grid-cols-2">
          <ListPanel emptyMessage={primaryEmptyMessage} items={primaryItems} title={primaryListTitle} />
          <ListPanel emptyMessage={secondaryEmptyMessage} items={secondaryItems} title={secondaryListTitle} />
        </section>
      ) : null}

      {!executiveSections?.length && weeklySummaryCards?.length ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{weeklySummaryTitle ?? "Weekly Summary"}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {weeklySummaryCards.map((card) => (
              <article className="rounded-[1.4rem] border border-slate-100 bg-slate-50 p-4" key={card.label}>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-blue-600">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{card.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!executiveSections?.length && (notifications?.length || calendarItems?.length) ? (
        <section className="grid gap-6 md:grid-cols-2">
          <NotificationPanel items={notifications ?? []} title={notificationTitle ?? "Notifications"} />
          <CalendarPanel items={calendarItems ?? []} title={calendarTitle ?? "Calendar"} />
        </section>
      ) : null}

      {!executiveSections?.length && performanceRows?.length ? <PerformancePanel rows={performanceRows} title={performanceTitle ?? "Performance"} /> : null}

      {!executiveSections?.length && directoryTitle && directoryItems ? (
        <ListPanel emptyMessage={directoryEmptyMessage ?? "No records available."} items={directoryItems} title={directoryTitle} />
      ) : null}
    </div>
  );
}

function ExecutiveSectionPanel({ section }: { section: ExecutiveOverviewSection }) {
  const accent = getExecutiveSectionAccent(section.id, true);

  if (section.id === "projects") {
    return <ProjectPortfolioPanel section={section} accent={accent} />;
  }

  if (section.id === "workforce") {
    return <WorkforcePulsePanel section={section} />;
  }

  if (section.id === "meetings") {
    return <MeetingSchedulePanel section={section} />;
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className={`h-1.5 ${accent.bar}`} />
      <div className="p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">{section.badge}</p>
            <h4 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">{section.title}</h4>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{section.description}</p>
          </div>

          <div className="rounded-[1.6rem] border border-slate-100 bg-slate-50 p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Section Status</p>
            <div className="mt-3 space-y-3">
              {section.metrics.slice(0, 2).map((metric) => (
                <div className="flex items-center justify-between rounded-[1rem] border border-white bg-white px-4 py-3" key={metric.label}>
                  <span className="text-sm font-medium text-slate-600">{metric.label}</span>
                  <span className="text-lg font-semibold text-slate-950">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {section.note ? (
          <div className="mt-4 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">{section.note}</div>
        ) : null}

        {section.id === "leads" ? <InlineClientPitchForm owners={section.meetingOwners ?? []} /> : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {section.metrics.map((metric) => (
            <article className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]" key={metric.label}>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-blue-600">{metric.label}</p>
              <p className="mt-3 text-[2rem] font-semibold leading-none text-slate-950">{metric.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">{metric.detail}</p>
            </article>
          ))}
        </div>

        {section.id === "payments" ? (
          <div className="mt-4 overflow-hidden rounded-[1.8rem] border border-amber-200/60"
            style={{ background: "linear-gradient(135deg,#fffbeb 0%,#fff7ed 50%,#ffffff 100%)" }}>
            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              style={{ borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg,#92400e,#d97706)" }}>
                  <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="white" strokeLinecap="round" strokeWidth="2.2" />
                  </svg>
                </div>
                <div>
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-amber-700">Finance Module</p>
                  <h5 className="text-lg font-black tracking-tight text-slate-950">Payment Pipeline</h5>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-amber-700">
                  {section.items.length} record{section.items.length !== 1 ? "s" : ""}
                </span>
                <Link
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                  href="/dashboard/payments"
                  style={{ background: "linear-gradient(135deg,#92400e 0%,#d97706 60%,#f59e0b 100%)", boxShadow: "0 4px 14px rgba(245,158,11,0.3)" }}
                >
                  <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
                    <path d="M12 5v14M5 12h14" stroke="white" strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                  Add Payment
                </Link>
                <Link
                  className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                  href="/dashboard/payments"
                >
                  View All →
                </Link>
              </div>
            </div>

            <div className="p-5 grid gap-3 sm:grid-cols-2">
              {section.items.length ? (
                section.items.map((item) => (
                  <Link
                    className="group block rounded-[1.4rem] border border-amber-100 bg-white p-4 shadow-[0_4px_14px_rgba(245,158,11,0.06)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_8px_24px_rgba(245,158,11,0.12)]"
                    href="/dashboard/payments"
                    key={item.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide"
                        style={
                          item.meta?.includes("PAID") ? { background: "#ecfdf5", color: "#065f46", borderColor: "#6ee7b7" }
                          : item.meta?.includes("OVERDUE") ? { background: "#fff1f2", color: "#be123c", borderColor: "#fca5a5" }
                          : item.meta?.includes("PARTIAL") ? { background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" }
                          : { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }
                        }>
                        {item.meta?.split("||")[0] ?? "PENDING"}
                      </span>
                      <svg className="text-slate-300 transition group-hover:text-amber-400" fill="none" height="14" viewBox="0 0 24 24" width="14">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <p className="mt-3 font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                    {(() => {
                      const parts = item.meta?.split("||") ?? [];
                      const total = parts[1], received = parts[2], balance = parts[3], due = parts[4];
                      if (!total) return null;
                      return (
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3">
                          <span className="text-[0.65rem] font-bold text-slate-700">Total: {total}</span>
                          {received && received !== "₹0" ? <span className="text-[0.65rem] font-semibold text-emerald-600">Rcvd: {received}</span> : null}
                          {balance && balance !== "₹0" ? <span className="text-[0.65rem] font-semibold text-amber-600">Due: {balance}</span> : null}
                          {due ? <span className="text-[0.65rem] text-slate-400">Due date: {due}</span> : null}
                        </div>
                      );
                    })()}
                  </Link>
                ))
              ) : (
                <div className="sm:col-span-2 rounded-[1.4rem] border border-dashed border-amber-200 bg-amber-50/40 p-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
                      <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#d97706" strokeLinecap="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-amber-800">No payment records yet</p>
                    <Link className="mt-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition" href="/dashboard/payments">
                      Add First Payment →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
        <div className="mt-5 rounded-[1.7rem] border border-slate-100 bg-slate-50/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Detailed Information</p>
              <h5 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{section.title} Details</h5>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {section.items.length} item(s)
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {section.items.length ? (
              section.items.map((item) => {
                const isWorkforce = section.id === "workforce";
                const content = (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-blue-700">
                        {item.meta}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{section.badge}</span>
                    </div>
                    <h6 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h6>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                    {isWorkforce ? (
                      <p className="mt-3 text-xs font-semibold text-blue-500">View profile →</p>
                    ) : null}
                  </>
                );
                return isWorkforce ? (
                  <Link
                    className="block rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                    href={`/dashboard/employees/${item.id}`}
                    key={item.id}
                  >
                    {content}
                  </Link>
                ) : (
                  <article className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]" key={item.id}>
                    {content}
                  </article>
                );
              })
            ) : (
              <div className="lg:col-span-2">
                <EmptyState message={section.emptyMessage} />
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}

function FilterContextNote({
  filterDate,
  filterLabel,
  filterMonth,
  sectionTitle,
}: {
  filterDate?: string;
  filterLabel?: string;
  filterMonth?: string;
  sectionTitle: string;
}) {
  const isFiltered = Boolean(filterDate || filterMonth);
  const rawValue = filterDate ?? filterMonth;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[1.1rem] border border-blue-100 bg-blue-50/80 px-4 py-3 text-xs text-blue-800">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${isFiltered ? "bg-blue-600" : "bg-emerald-500"}`} />
        <span className="truncate font-semibold">
          {sectionTitle} data {isFiltered ? `filtered by ${filterLabel ?? rawValue}` : "showing today's live view"}
        </span>
      </div>
      {rawValue ? (
        <span className="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-1 font-bold text-blue-700">
          {filterDate ? "Date" : "Month"}: {rawValue}
        </span>
      ) : null}
    </div>
  );
}

function parseEmployeeDescription(description: string) {
  const [email = "", phone = "", status = "Active today"] = description.split("|").map((part) => part.trim());
  return { email, phone, status };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "EM";
}

function getMetricValue(metrics: SummaryCard[], label: string) {
  return Number(metrics.find((metric) => metric.label === label)?.value.replace(/[^\d.-]/g, "") ?? "0") || 0;
}

function InlineClientPitchForm({ owners }: { owners: Array<{ id: string; name: string; email: string }> }) {
  const [state, action, pending] = useActionState(createSalesLead, INLINE_PITCH_INITIAL_STATE);
  const defaultOwnerId = state.values?.salesUserId ?? owners[0]?.id ?? "";

  return (
    <section className="mt-5 rounded-[1.5rem] border border-violet-200 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_55%,#f8fbff_100%)] p-5 shadow-[0_14px_30px_rgba(124,58,237,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-violet-700">Add Client Pitch</p>
          <h5 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Log a project conversation here</h5>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Save what the client asked for, what you quoted, meeting/follow-up dates, and the next action.
          </p>
        </div>
        <span className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700">
          Dashboard Entry
        </span>
      </div>

      {state.error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{state.error}</div> : null}
      {state.success ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{state.success}</div> : null}

      <form action={action} className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <PitchField label="Client Name" name="clientName" placeholder="Client or contact name" required />
          <PitchField label="Company" name="companyName" placeholder="Company name" />
          <PitchSelect defaultValue={defaultOwnerId} label="Owner" name="salesUserId" options={owners.map((owner) => ({ label: `${owner.name} (${owner.email})`, value: owner.id }))} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <PitchField label="Phone" name="clientPhone" placeholder="+91 99999 00000" />
          <PitchField label="Email" name="clientEmail" placeholder="client@example.com" type="email" />
          <PitchSelect defaultValue={state.values?.source ?? "Call"} label="Source" name="source" options={INLINE_PITCH_SOURCES.map((item) => ({ label: item, value: item }))} />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <PitchSelect defaultValue={state.values?.status ?? "CONTACTED"} label="Pipeline Status" name="status" options={INLINE_PITCH_STATUSES.map((item) => ({ label: item.replaceAll("_", " "), value: item }))} />
          <PitchSelect defaultValue={state.values?.priority ?? "WARM"} label="Priority" name="priority" options={INLINE_PITCH_PRIORITIES.map((item) => ({ label: item, value: item }))} />
          <PitchSelect defaultValue={state.values?.technologies?.[0] ?? "Custom Website"} label="Service Discussed" name="technologies" options={INLINE_PITCH_SERVICES.map((item) => ({ label: item, value: item }))} />
          <PitchField label="Client Budget" name="budget" placeholder="Amount" type="number" />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <PitchField label="Quoted Price" name="pitchedPrice" placeholder="Amount" type="number" />
          <PitchField label="Meeting Date" name="meetingDate" type="date" />
          <PitchField label="Meeting Time" name="meetingTime" type="time" />
          <PitchField label="Next Follow-up" name="nextFollowUpDate" type="date" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PitchTextArea label="Conversation Notes" name="callNotes" placeholder="What was discussed, client response, objections, and next action..." />
          <PitchTextArea label="Proposal / Project Notes" name="notes" placeholder="Scope, pricing, timeline, delivery commitment, or proposal details..." />
        </div>

        <div className="flex justify-end">
          <button
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(124,58,237,0.24)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending || owners.length === 0}
            type="submit"
          >
            {pending ? "Saving..." : "Save Client Pitch"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PitchField({
  label,
  name,
  placeholder = "",
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-50" name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function PitchSelect({ defaultValue, label, name, options }: { defaultValue?: string; label: string; name: string; options: Array<{ label: string; value: string }> }) {
  return (
    <label className="block">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-50" defaultValue={defaultValue ?? options[0]?.value ?? ""} name={name} required>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PitchTextArea({ label, name, placeholder }: { label: string; name: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <textarea className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-50" name={name} placeholder={placeholder} />
    </label>
  );
}

function WorkforcePulsePanel({ section }: { section: ExecutiveOverviewSection }) {
  const totalEmployees = getMetricValue(section.metrics, "Total Employees");
  const presentToday = getMetricValue(section.metrics, "Present Today") || getMetricValue(section.metrics, "Present");
  const onLeave = getMetricValue(section.metrics, "On Leave");
  const notMarked = getMetricValue(section.metrics, "Not Marked");
  const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
  const todayCards = [
    { label: "Total Employees", value: String(totalEmployees), detail: "Active team strength", tone: "slate" },
    { label: "Present Today", value: String(presentToday), detail: "Attendance marked today", tone: "emerald" },
    { label: "On Leave", value: String(onLeave), detail: "Approved leave today", tone: "amber" },
    { label: "Not Marked", value: String(notMarked), detail: "Attendance pending", tone: "rose" },
  ];

  return (
    <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
      <div className="h-1 bg-gradient-to-r from-emerald-700 via-teal-400 to-amber-300" />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">{section.badge}</p>
            <h4 className="mt-1 text-[1.8rem] font-semibold tracking-tight text-slate-950">{section.title}</h4>
          </div>
          <Link
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
            href="/dashboard/employees"
          >
            Manage Team
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {todayCards.map((card) => (
            <article className={`rounded-[1.2rem] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${getWorkforceStatusCardClass(card.tone)}`} key={card.label}>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]">{card.label}</p>
              <p className="mt-3 text-[2rem] font-semibold leading-none">{card.value}</p>
              <p className="mt-3 text-sm leading-5 opacity-75">{card.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-[1.3rem] border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Today Summary</p>
              <p className="mt-1 text-sm text-slate-600">
                Attendance rate <span className="font-semibold text-emerald-700">{attendanceRate}%</span> | Present {presentToday} | Leave {onLeave} | Not marked {notMarked}
              </p>
            </div>
            <div className="min-w-48 flex-1 sm:max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-400 to-amber-300" style={{ width: `${attendanceRate}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-slate-100 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="p-5 pb-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Employee List</p>
              <h5 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">All Employee Details</h5>
            </div>
            <span className="mx-5 mt-5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {section.items.length} employee(s)
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            {section.items.length ? (
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Today Status</th>
                    <th className="px-5 py-3">Joining</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {section.items.map((item) => {
                    const employee = parseEmployeeDescription(item.description);
                    const isOnLeave = /leave/i.test(item.meta) || /leave/i.test(employee.status);
                    const isNotMarked = /not marked/i.test(employee.status);
                    return (
                      <tr className="transition hover:bg-emerald-50/40" key={item.id}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]">
                              {getInitials(item.title)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-950">{item.title}</p>
                              <p className="mt-0.5 text-xs text-slate-500">Employee</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">{employee.email || "Email not added"}</p>
                          <p className="mt-1 text-xs text-slate-500">{employee.phone || "Phone not added"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${isOnLeave ? "border-amber-200 bg-amber-50 text-amber-800" : isNotMarked ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                            {isOnLeave ? "On Leave" : isNotMarked ? "Not Marked" : "Present"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{item.meta.replace("Joined ", "") || "Not added"}</td>
                        <td className="px-5 py-4 text-right">
                          <Link className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 hover:text-emerald-900" href={`/dashboard/employees/${item.id}`}>
                            Profile
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-5">
                <EmptyState message={section.emptyMessage} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function getWorkforceStatusCardClass(tone: string) {
  if (tone === "emerald") {
    return "border-emerald-100 bg-emerald-50 text-emerald-950";
  }
  if (tone === "amber") {
    return "border-amber-100 bg-amber-50 text-amber-950";
  }
  if (tone === "rose") {
    return "border-rose-100 bg-rose-50 text-rose-950";
  }
  return "border-slate-100 bg-slate-50 text-slate-950";
}

function parseMeetingMeta(meta: string) {
  const [type = "Meeting", time = "Time not set", owner = "Team", status = "Scheduled"] = meta.split("||").map((part) => part.trim());
  return { owner, status, time, type };
}

function parseMeetingDescription(description: string) {
  const [contact = "Contact not added", technology = "Tech not added", budget = "N/A", quoted = "N/A", delivery = "Not fixed"] = description
    .split("||")
    .map((part) => part.trim());

  return { budget, contact, delivery, quoted, technology };
}

function MeetingSchedulePanel({ section }: { section: ExecutiveOverviewSection }) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, pending] = useActionState<ClientMeetingFormState, FormData>(createClientMeeting, {});
  const totalMeetings = getMetricValue(section.metrics, "Meetings Today");
  const clientMeetings = getMetricValue(section.metrics, "Client Meetings");
  const peopleInMeetings = getMetricValue(section.metrics, "People In Meetings");
  const pendingMeetings = getMetricValue(section.metrics, "Pending");
  const meetingCards = [
    { label: "Today's Meetings", value: String(totalMeetings), detail: "Total scheduled today", tone: "rose" },
    { label: "Client Meetings", value: String(clientMeetings), detail: "Sales client schedule", tone: "violet" },
    { label: "Team Linked", value: String(peopleInMeetings), detail: "People assigned", tone: "sky" },
    { label: "Pending", value: String(pendingMeetings), detail: "Still open", tone: "amber" },
  ];

  return (
    <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
      <div className="h-1 bg-gradient-to-r from-rose-600 via-pink-400 to-amber-300" />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700">{section.badge}</p>
            <h4 className="mt-1 text-[1.8rem] font-semibold tracking-tight text-slate-950">{section.title}</h4>
          </div>
          <button
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-800 transition hover:border-rose-300 hover:bg-rose-100"
            onClick={() => setShowForm((value) => !value)}
            type="button"
          >
            {showForm ? "Close" : "Add Meeting"}
          </button>
        </div>

        {showForm ? (
          <form action={formAction} className="mt-4 rounded-[1.3rem] border border-rose-100 bg-rose-50/50 p-4">
            {state.error ? <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p> : null}
            {state.success ? <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{state.success}</p> : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Sales Owner
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-rose-300" defaultValue={state.values?.salesUserId ?? section.meetingOwners?.[0]?.id ?? ""} name="salesUserId" required>
                  <option value="">Select owner</option>
                  {(section.meetingOwners ?? []).map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Client Name
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-rose-300" defaultValue={state.values?.clientName ?? ""} name="clientName" placeholder="Client name" required />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Meeting Date
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-rose-300" defaultValue={state.values?.meetingDate ?? ""} name="meetingDate" required type="date" />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Meeting Time
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-rose-300" defaultValue={state.values?.meetingTime ?? ""} name="meetingTime" type="time" />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Phone
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-rose-300" defaultValue={state.values?.clientPhone ?? ""} name="clientPhone" placeholder="Client phone" />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Email
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-rose-300" defaultValue={state.values?.clientEmail ?? ""} name="clientEmail" placeholder="Client email" type="email" />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Budget
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-rose-300" defaultValue={state.values?.budget ?? ""} min="0" name="budget" placeholder="0" type="number" />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Quote
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-rose-300" defaultValue={state.values?.pitchedPrice ?? ""} min="0" name="pitchedPrice" placeholder="0" type="number" />
              </label>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Note
                <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-rose-300" defaultValue={state.values?.notes ?? ""} name="notes" placeholder="Meeting agenda or note" />
              </label>
              <button className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60" disabled={pending || !section.meetingOwners?.length} type="submit">
                {pending ? "Saving..." : "Save Meeting"}
              </button>
            </div>
            {!section.meetingOwners?.length ? <p className="mt-3 text-xs font-semibold text-amber-700">Create an active Sales user first, then add client meetings.</p> : null}
          </form>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {meetingCards.map((card) => (
            <article className={`rounded-[1.2rem] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${getMeetingStatusCardClass(card.tone)}`} key={card.label}>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]">{card.label}</p>
              <p className="mt-3 text-[2rem] font-semibold leading-none">{card.value}</p>
              <p className="mt-3 text-sm leading-5 opacity-75">{card.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-slate-100 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="p-5 pb-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700">Meeting List</p>
              <h5 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Client & Team Schedule</h5>
            </div>
            <span className="mx-5 mt-5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {section.items.length} meeting(s)
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            {section.items.length ? (
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-5 py-3">Client / Meeting</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Contact / Tech</th>
                    <th className="px-5 py-3">Budget / Quote</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {section.items.map((item) => {
                    const meta = parseMeetingMeta(item.meta);
                    const detail = parseMeetingDescription(item.description);
                    const isCompleted = /completed/i.test(meta.status);
                    return (
                      <tr className="transition hover:bg-rose-50/40" key={item.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-950">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{meta.type}</p>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700">{meta.time}</td>
                        <td className="px-5 py-4 text-slate-600">{meta.owner}</td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">{detail.contact}</p>
                          <p className="mt-1 text-xs text-slate-500">{detail.technology}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">Budget {detail.budget}</p>
                          <p className="mt-1 text-xs text-slate-500">Quote {detail.quoted}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${isCompleted ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                            {meta.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-5">
                <EmptyState message={section.emptyMessage} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function getMeetingStatusCardClass(tone: string) {
  if (tone === "rose") {
    return "border-rose-100 bg-rose-50 text-rose-950";
  }
  if (tone === "violet") {
    return "border-violet-100 bg-violet-50 text-violet-950";
  }
  if (tone === "sky") {
    return "border-sky-100 bg-sky-50 text-sky-950";
  }
  return "border-amber-100 bg-amber-50 text-amber-950";
}

/* ─── Project Portfolio Panel ─── */
function parseProjectMeta(meta: string) {
  const parts = meta.split("||");
  if (parts.length === 5) {
    return {
      status: parts[0] ?? "PLANNING",
      priority: parts[1] ?? "MEDIUM",
      closedByEmployee: parts[2] === "1",
      assignees: Number(parts[3] ?? "0"),
      dueDate: parts[4] ?? "",
    };
  }
  return { status: "PLANNING", priority: "MEDIUM", closedByEmployee: false, assignees: 0, dueDate: "" };
}

const PROJECT_STATUS_CFG: Record<string, { label: string; dot: string; chipBg: string; chipText: string; border: string }> = {
  IN_PROGRESS: { label: "In Progress",  dot: "#10b981", chipBg: "#ecfdf5", chipText: "#065f46", border: "#10b981" },
  PLANNING:    { label: "Planning",     dot: "#3b82f6", chipBg: "#eff6ff", chipText: "#1d4ed8", border: "#3b82f6" },
  ON_HOLD:     { label: "On Hold",      dot: "#f59e0b", chipBg: "#fffbeb", chipText: "#92400e", border: "#f59e0b" },
  COMPLETED:   { label: "Completed",    dot: "#64748b", chipBg: "#f1f5f9", chipText: "#334155", border: "#64748b" },
  CLOSED_EMP:  { label: "Closed by Emp",dot: "#7c3aed", chipBg: "#f5f3ff", chipText: "#4c1d95", border: "#7c3aed" },
};

const PRIORITY_CFG: Record<string, { bg: string; text: string }> = {
  HIGH:   { bg: "#fff1f2", text: "#be123c" },
  MEDIUM: { bg: "#fffbeb", text: "#92400e" },
  LOW:    { bg: "#f8fafc", text: "#64748b" },
};

function ProjectPortfolioPanel({
  section,
}: {
  accent: ReturnType<typeof getExecutiveSectionAccent>;
  section: ExecutiveOverviewSection;
}) {
  const closedByEmpCount = Number(section.metrics.find((m) => m.label === "Closed by Employee")?.value ?? "0");

  const statColors = ["#2563eb", "#10b981", "#64748b", "#f59e0b", "#7c3aed"];

  return (
    <section className="mt-5 overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.07)]">

      {/* ── Top accent line ── */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-300" />

      <div className="p-6">

        {/* ── Title row ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.32em] text-blue-600">Project Portfolio</p>
            <h4 className="mt-1.5 text-[1.6rem] font-bold tracking-tight text-slate-900">Project Overview</h4>
            <p className="mt-1 text-sm text-slate-500">Live execution status across all company projects.</p>
          </div>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-700">
            {section.items.length} Project{section.items.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Stat cards ── */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {section.metrics.map((metric, i) => {
            const color = statColors[i % statColors.length];
            const lightBgs = ["#eff6ff", "#ecfdf5", "#f1f5f9", "#fffbeb", "#f5f3ff"];
            return (
              <div
                className="relative overflow-hidden rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                key={metric.label}
                style={{
                  background: lightBgs[i % lightBgs.length],
                  border: `1px solid ${color}22`,
                  boxShadow: `0 2px 12px ${color}14`,
                }}
              >
                {/* Decorative circle */}
                <div
                  className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-10"
                  style={{ background: color }}
                />
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em]" style={{ color }}>
                    {metric.label}
                  </p>
                </div>
                <p className="mt-2 text-[2.4rem] font-black leading-none tracking-tight" style={{ color }}>
                  {metric.value}
                </p>
                <p className="mt-2 text-[0.66rem] leading-4 text-slate-500">{metric.detail}</p>
              </div>
            );
          })}
        </div>

        {/* ── Closed by employee alert ── */}
        {closedByEmpCount > 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="#7c3aed" strokeLinecap="round" strokeWidth="2.2" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-violet-900">
                {closedByEmpCount} project{closedByEmpCount !== 1 ? "s" : ""} self-reported as closed by employees
              </p>
              <p className="mt-0.5 text-xs text-violet-600">Go to the Projects page to review and verify these closures.</p>
            </div>
          </div>
        ) : null}

        {/* ── Project cards — horizontal scroll so dashboard stays compact ── */}
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              {section.items.length} Project{section.items.length !== 1 ? "s" : ""} · scroll to see all →
            </p>
          </div>

          {section.items.length === 0 ? (
            <EmptyState message={section.emptyMessage} />
          ) : (
            <div
              className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {section.items.map((item) => {
                const p = parseProjectMeta(item.meta);
                const sc = p.closedByEmployee ? PROJECT_STATUS_CFG.CLOSED_EMP : (PROJECT_STATUS_CFG[p.status] ?? PROJECT_STATUS_CFG.PLANNING);
                const pc = PRIORITY_CFG[p.priority] ?? PRIORITY_CFG.LOW;

                const accentBg =
                  p.closedByEmployee ? "linear-gradient(135deg,#f5f3ff,#ede9fe)"
                  : p.status === "IN_PROGRESS" ? "linear-gradient(135deg,#ecfdf5,#d1fae5)"
                  : p.status === "ON_HOLD" ? "linear-gradient(135deg,#fffbeb,#fef3c7)"
                  : p.status === "COMPLETED" ? "linear-gradient(135deg,#f8fafc,#f1f5f9)"
                  : "linear-gradient(135deg,#eff6ff,#dbeafe)";

                return (
                  <Link
                    href={`/dashboard/projects/${item.id}`}
                    key={item.id}
                    className="group flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                    style={{
                      border: "1px solid #e2e8f0",
                      borderTop: `3px solid ${sc.border}`,
                      boxShadow: "0 4px 18px rgba(15,23,42,0.06)",
                      scrollSnapAlign: "start",
                    }}
                  >
                    {/* Card tinted header */}
                    <div className="px-4 pt-4 pb-3" style={{ background: accentBg }}>
                      <div className="flex items-start justify-between gap-2">
                        <h6
                          className="text-[0.92rem] font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-700"
                          style={{ maxWidth: "calc(100% - 90px)" }}
                        >
                          {item.title}
                        </h6>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider"
                          style={{ background: sc.chipBg, color: sc.chipText, border: `1px solid ${sc.border}22` }}
                        >
                          {sc.label}
                        </span>
                      </div>

                      {/* Priority pill */}
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[0.56rem] font-bold uppercase tracking-wider"
                          style={{ background: pc.bg, color: pc.text }}
                        >
                          {p.priority} Priority
                        </span>
                        {p.closedByEmployee ? (
                          <span className="text-[0.62rem] font-semibold text-violet-600">✓ Employee closed</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex flex-1 flex-col px-4 py-3">
                      <p className="line-clamp-2 text-[0.76rem] leading-5 text-slate-500">
                        {item.description}
                      </p>

                      {/* Footer */}
                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-3">
                        <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-slate-400">
                          <svg fill="none" height="11" viewBox="0 0 24 24" width="11">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          {p.assignees > 0 ? `${p.assignees} member${p.assignees !== 1 ? "s" : ""}` : "Unassigned"}
                        </span>
                        {p.dueDate ? (
                          <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-slate-400">
                            <svg fill="none" height="11" viewBox="0 0 24 24" width="11">
                              <rect height="18" rx="2" stroke="currentColor" strokeWidth="2" width="18" x="3" y="4" />
                              <line stroke="currentColor" strokeWidth="2" x1="3" x2="21" y1="10" y2="10" />
                            </svg>
                            {p.dueDate}
                          </span>
                        ) : null}
                      </div>

                      {/* Open arrow */}
                      <div className="mt-2 flex items-center justify-end">
                        <span className="text-[0.65rem] font-semibold text-blue-500 group-hover:text-blue-700 transition-colors">
                          Open Project →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MetricBarPanel({
  metrics,
  sectionId,
  title,
}: {
  metrics: SummaryCard[];
  sectionId: string;
  title: string;
}) {
  const chartData = buildExecutiveMetricData(metrics, sectionId);

  return (
    <ChartPanel description="Metric chart for the currently selected leadership box." title={title}>
      {chartData.length ? (
        <div className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-3">
          <ResponsiveContainer height={248} width="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="#64748b" tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell fill={entry.color} key={entry.label} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState message="No metric chart data is available for this section." />
      )}
    </ChartPanel>
  );
}

function MetricBreakdownPanel({
  metrics,
  sectionId,
  title,
}: {
  metrics: SummaryCard[];
  sectionId: string;
  title: string;
}) {
  return <BreakdownPanel data={buildExecutiveMetricData(metrics, sectionId)} title={title} />;
}

function ExecutiveQuickPanel({ section }: { section: ExecutiveOverviewSection }) {
  return (
    <ChartPanel description="Quick summary of the selected leadership box." title="Quick Highlights">
      <div className="space-y-3">
        {section.metrics.slice(0, 4).map((metric) => (
          <div className="flex items-center justify-between rounded-[1rem] border border-slate-100 bg-slate-50 px-4 py-3" key={metric.label}>
            <div className="pr-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{metric.detail}</p>
            </div>
            <span className="text-2xl font-semibold text-slate-950">{metric.value}</span>
          </div>
        ))}
      </div>
    </ChartPanel>
  );
}

function getExecutiveSectionAccent(sectionId: string, isActive: boolean) {
  const palette =
    sectionId === "projects"
      ? {
          bar: "bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-300",
          activeBg: "bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_62%,#dbeafe_100%)]",
          activeBorder: "border-blue-300",
          activeTitle: "text-white",
          activeDescription: "text-blue-50/90",
          activeEyebrow: "text-blue-100",
          activePill: "border-white/20 bg-white/10 text-white",
          activeMetricShell: "border-white/10 bg-white/10",
          activeMetricLabel: "text-blue-100/80",
          activeMetricValue: "text-white",
          activeMetricHint: "text-blue-100/75",
          activeMetricDivider: "border-white/10",
          activeFooter: "text-white",
        }
      : sectionId === "payments"
        ? {
            bar: "bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300",
            activeBg: "bg-[linear-gradient(135deg,#78350f_0%,#f59e0b_68%,#fef3c7_100%)]",
            activeBorder: "border-amber-300",
            activeTitle: "text-white",
            activeDescription: "text-amber-50/90",
            activeEyebrow: "text-amber-100",
            activePill: "border-white/20 bg-white/10 text-white",
            activeMetricShell: "border-white/10 bg-white/10",
            activeMetricLabel: "text-amber-100/80",
            activeMetricValue: "text-white",
            activeMetricHint: "text-amber-100/75",
            activeMetricDivider: "border-white/10",
            activeFooter: "text-white",
          }
        : sectionId === "workforce"
          ? {
              bar: "bg-gradient-to-r from-emerald-700 via-teal-400 to-amber-300",
              activeBg: "bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.32),transparent_34%),linear-gradient(135deg,#052e2b_0%,#047857_58%,#d1fae5_100%)]",
              activeBorder: "border-emerald-200",
              activeTitle: "text-white",
              activeDescription: "text-emerald-50/90",
              activeEyebrow: "text-emerald-100",
              activePill: "border-white/20 bg-white/10 text-white",
              activeMetricShell: "border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
              activeMetricLabel: "text-emerald-100/80",
              activeMetricValue: "text-white",
              activeMetricHint: "text-emerald-100/75",
              activeMetricDivider: "border-white/10",
              activeFooter: "text-white",
            }
          : sectionId === "leads"
            ? {
                bar: "bg-gradient-to-r from-fuchsia-500 via-violet-400 to-purple-300",
                activeBg: "bg-[linear-gradient(135deg,#581c87_0%,#7c3aed_62%,#ede9fe_100%)]",
                activeBorder: "border-violet-300",
                activeTitle: "text-white",
                activeDescription: "text-violet-50/90",
                activeEyebrow: "text-violet-100",
                activePill: "border-white/20 bg-white/10 text-white",
                activeMetricShell: "border-white/10 bg-white/10",
                activeMetricLabel: "text-violet-100/80",
                activeMetricValue: "text-white",
                activeMetricHint: "text-violet-100/75",
                activeMetricDivider: "border-white/10",
                activeFooter: "text-white",
              }
            : {
                bar: "bg-gradient-to-r from-rose-500 via-pink-400 to-orange-300",
                activeBg: "bg-[linear-gradient(135deg,#7f1d1d_0%,#e11d48_62%,#ffe4e6_100%)]",
                activeBorder: "border-rose-300",
                activeTitle: "text-white",
                activeDescription: "text-rose-50/90",
                activeEyebrow: "text-rose-100",
                activePill: "border-white/20 bg-white/10 text-white",
                activeMetricShell: "border-white/10 bg-white/10",
                activeMetricLabel: "text-rose-100/80",
                activeMetricValue: "text-white",
                activeMetricHint: "text-rose-100/75",
                activeMetricDivider: "border-white/10",
                activeFooter: "text-white",
              };

  if (isActive) {
    return {
      bar: palette.bar,
      card: `${palette.activeBorder} ${palette.activeBg} shadow-[0_24px_44px_rgba(15,23,42,0.14)]`,
      eyebrow: palette.activeEyebrow,
      pill: palette.activePill,
      title: palette.activeTitle,
      description: palette.activeDescription,
      metricShell: palette.activeMetricShell,
      metricLabel: palette.activeMetricLabel,
      metricValue: palette.activeMetricValue,
      metricHint: palette.activeMetricHint,
      metricDivider: palette.activeMetricDivider,
      footer: palette.activeFooter,
    };
  }

  return {
    bar: palette.bar,
    card: "border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]",
    eyebrow: "text-blue-600",
    pill: "border-slate-200 bg-slate-50 text-slate-600",
    title: "text-slate-950",
    description: "text-slate-600",
    metricShell: "border-slate-100 bg-slate-50",
    metricLabel: "text-slate-500",
    metricValue: "text-slate-950",
    metricHint: "text-slate-400",
    metricDivider: "border-slate-200",
    footer: "text-blue-700",
  };
}

function ChartPanel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200/80 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BreakdownPanel({ data, title }: { data: DashboardBreakdownSlice[]; title: string }) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <ChartPanel description="Distribution snapshot for today’s workflow state." title={title}>
      {data.length ? (
        <>
          {total > 0 ? (
            <div className="rounded-[1.5rem] border border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-3">
              <ResponsiveContainer height={208} width="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius={52} outerRadius={82} paddingAngle={3}>
                    {data.map((entry) => (
                      <Cell fill={entry.color} key={entry.label} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              No activity available for this breakdown right now.
            </div>
          )}
          <div className="mt-3 grid gap-2.5">
            {data.map((entry) => (
              <div className="flex items-center justify-between rounded-[1rem] border border-slate-100 bg-slate-50 px-4 py-2.5" key={entry.label}>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm font-medium text-slate-700">{entry.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-950">{entry.value}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState message="No breakdown data available." />
      )}
    </ChartPanel>
  );
}

function EmployeeProjectPanel({ rows }: { rows: EmployeeProjectSummaryRow[] }) {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">Project Completion</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">Employee-wise project completion summary so the admin can spot pending delivery quickly.</p>
      <div className="mt-6 overflow-x-auto rounded-[1.4rem] border border-slate-100">
        <table className="min-w-full border-collapse bg-white text-sm text-slate-700">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Employee</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Pending Projects</th>
              <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Completed Projects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-4 align-top">
                  <p className="font-semibold text-slate-900">{row.employeeName}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.employeeEmail}</p>
                </td>
                <td className="px-4 py-4 align-top text-amber-700">{row.pendingProjects}</td>
                <td className="px-4 py-4 align-top text-emerald-700">{row.completedProjects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ListPanel({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: DashboardListItem[];
  title: string;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
      <div className="mt-6 space-y-4">
        {items.length ? (
          items.map((item) => (
            <article className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  {item.meta}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))
        ) : (
          <EmptyState message={emptyMessage} />
        )}
      </div>
    </section>
  );
}

function NotificationPanel({ items, title }: { items: DashboardNotificationItem[]; title: string }) {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
      <div className="mt-6 space-y-4">
        {items.length ? (
          items.map((item) => (
            <article className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  {item.meta}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
            </article>
          ))
        ) : (
          <EmptyState message="No notifications right now." />
        )}
      </div>
    </section>
  );
}

function CalendarPanel({ items, title }: { items: CalendarEventItem[]; title: string }) {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
      <div className="mt-6 space-y-4">
        {items.length ? (
          items.map((item) => (
            <article className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {item.date}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {item.type}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
            </article>
          ))
        ) : (
          <EmptyState message="No upcoming events in the current view." />
        )}
      </div>
    </section>
  );
}

function PerformancePanel({ rows, title }: { rows: PerformanceScoreRow[]; title: string }) {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">{title}</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <article className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5" key={row.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{row.employeeName}</h3>
                <p className="mt-1 text-sm text-slate-500">{row.employeeEmail}</p>
              </div>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                Score {row.score}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricChip label="Attendance" value={`${row.attendanceRate}%`} />
              <MetricChip label="Tasks" value={`${row.taskCompletionRate}%`} />
              <MetricChip label="DSR" value={`${row.dsrConsistencyRate}%`} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500">{message}</div>;
}

function buildExecutiveMetricData(metrics: SummaryCard[], sectionId: string): DashboardBreakdownSlice[] {
  const palette =
    sectionId === "projects"
      ? ["#2563eb", "#10b981", "#f59e0b", "#64748b"]
      : sectionId === "payments"
        ? ["#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"]
        : sectionId === "workforce"
          ? ["#0f766e", "#2563eb", "#f59e0b", "#ef4444"]
          : sectionId === "leads"
            ? ["#7c3aed", "#10b981", "#f97316", "#64748b"]
            : ["#e11d48", "#0ea5e9", "#10b981", "#64748b"];

  return metrics.map((metric, index) => ({
    label: metric.label,
    value: Number(metric.value.replace(/[^\d.-]/g, "")) || 0,
    color: palette[index % palette.length],
  }));
}

