"use client";

import { useState, useActionState } from "react";
import { updateAccountPassword, updateAccountProfile, updateCompanySettings } from "@/features/dashboard/actions/settings";
import { addHoliday, deleteHoliday } from "@/features/dashboard/actions/holidays";
import { Feedback } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";
import type { SettingsPageData, HolidayEntry } from "@/features/dashboard/types";

type SettingsPanelProps = {
  data: SettingsPageData;
};

const INITIAL_SETTINGS_STATE = {
  values: {
    companyName: "",
    workStart: "09:00",
    workEnd: "18:00",
    leavePolicy: "",
    workingDays: "26",
    salaryDay: "1",
    lateGraceMinutes: "15",
    officeName: "Vista Business Tower",
    officeAddress: "D270 Phase, 8B, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Punjab 140307",
  },
};
const INIT_HOLIDAY = { error: undefined, success: undefined };
const HOLIDAY_TYPES = ["PUBLIC", "OPTIONAL", "COMPANY"] as const;

const INITIAL_PASSWORD_STATE = {
  values: { confirmPassword: "", currentPassword: "", newPassword: "" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function OptionalInputField({
  defaultValue,
  label,
  name,
  placeholder,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-emerald-800">{label}</span>
      <input
        className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function GeoFenceToggle({
  defaultChecked,
  name,
}: {
  defaultChecked: boolean;
  name: string;
}) {
  const [enabled, setEnabled] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">Geo-fence Enable karein</p>
        <p className="text-xs text-slate-500">
          {enabled
            ? "OFFICE mode mein attendance sirf office ke andar hi lagegi"
            : "Abhi location verification band hai"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input type="hidden" name={name} value={String(enabled)} />
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${
            enabled ? "bg-emerald-500" : "bg-slate-200"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel({ data }: SettingsPanelProps) {
  const [settingsState, settingsAction, settingsPending] = useActionState(updateCompanySettings, {
    ...INITIAL_SETTINGS_STATE,
    values: {
      companyName: data.companyName,
      workStart: data.workStart,
      workEnd: data.workEnd,
      leavePolicy: data.leavePolicy,
      workingDays: String(data.workingDays ?? 26),
      salaryDay: String(data.salaryDay ?? 1),
      lateGraceMinutes: String(data.lateGraceMinutes ?? 15),
      officeName: data.officeName,
      officeAddress: data.officeAddress,
      officeLatitude: data.officeLatitude !== null ? String(data.officeLatitude) : "",
      officeLongitude: data.officeLongitude !== null ? String(data.officeLongitude) : "",
      geoFenceRadiusMeters: String(data.geoFenceRadiusMeters ?? 600),
      geoFenceEnabled: String(data.geoFenceEnabled ?? false),
    },
  });
  const [passwordState, passwordAction, passwordPending] = useActionState(updateAccountPassword, INITIAL_PASSWORD_STATE);
  const [profileState, profileAction, profilePending] = useActionState(updateAccountProfile, {
    values: { fullName: data.currentUserName, email: data.currentUserEmail },
  });
  const [holidayAddState, holidayAddAction, holidayAddPending] = useActionState(addHoliday, INIT_HOLIDAY);
  const [holidayDelState, holidayDelAction, holidayDelPending] = useActionState(deleteHoliday, INIT_HOLIDAY);
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  const initials = getInitials(data.currentUserName);

  return (
    <div className="space-y-5 px-3 py-3 sm:px-7 sm:py-6">
      {/* Page header */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-600">Account Settings</p>
        <h2 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-950">Profile &amp; Security</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Update your personal information and manage your account security settings.
        </p>
      </div>

      {/* Identity banner */}
      <div className="overflow-hidden rounded-[1.8rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#f0f9ff_55%,#f8fbff_100%)] shadow-[0_16px_40px_rgba(37,99,235,0.09)]">
        <div className="flex flex-wrap items-center gap-4 px-6 py-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] text-xl font-bold tracking-wide text-white shadow-[0_14px_32px_rgba(29,78,216,0.36)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold text-slate-950">{data.currentUserName}</p>
            <p className="mt-0.5 truncate text-sm text-slate-500">{data.currentUserEmail}</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 shadow-sm">
            {data.currentUserRoleLabel}
          </span>
        </div>
      </div>

      {/* Profile + Password - 2 col */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Edit Profile */}
        <section className="rounded-[1.8rem] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] border border-blue-100 bg-blue-50 text-blue-600">
              <PersonIcon />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-600">Personal Info</p>
              <h3 className="text-lg font-semibold leading-tight text-slate-950">Edit Profile</h3>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Update your display name and login email address.</p>

          <form action={profileAction} className="mt-5 space-y-4">
            {profileState.error ? <Feedback>{profileState.error}</Feedback> : null}
            {profileState.success ? <Feedback tone="success">{profileState.success}</Feedback> : null}

            <InputField
              defaultValue={profileState.values?.fullName ?? data.currentUserName}
              label="Full Name"
              name="fullName"
              placeholder="Enter your full name"
            />
            <InputField
              defaultValue={profileState.values?.email ?? data.currentUserEmail}
              label="Email Address"
              name="email"
              placeholder="Enter your email"
              type="email"
            />

            <Button className="sm:w-auto" disabled={profilePending} type="submit">
              {profilePending ? "Saving..." : "Update Profile"}
            </Button>
          </form>
        </section>

        {/* Change Password */}
        <section className="rounded-[1.8rem] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] border border-amber-100 bg-amber-50 text-amber-600">
              <LockIcon />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-amber-600">Security</p>
              <h3 className="text-lg font-semibold leading-tight text-slate-950">Change Password</h3>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Leave current password blank to directly set a new one.
          </p>

          <form action={passwordAction} className="mt-5 space-y-4">
            {passwordState.error ? <Feedback>{passwordState.error}</Feedback> : null}
            {passwordState.success ? <Feedback tone="success">{passwordState.success}</Feedback> : null}

            <PasswordField
              defaultValue={passwordState.values?.currentPassword}
              label="Current Password"
              name="currentPassword"
              placeholder="Optional — leave blank to skip"
            />
            <PasswordField
              defaultValue={passwordState.values?.newPassword}
              label="New Password"
              name="newPassword"
              placeholder="Enter new password"
            />
            <PasswordField
              defaultValue={passwordState.values?.confirmPassword}
              label="Confirm Password"
              name="confirmPassword"
              placeholder="Re-enter new password"
            />

            <Button className="sm:w-auto" disabled={passwordPending} type="submit">
              {passwordPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </section>
      </div>

      {/* Company Settings — admin only */}
      {data.canManageCompany ? (
        <>
        <section className="rounded-[1.8rem] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] border border-emerald-100 bg-emerald-50 text-emerald-600">
              <BuildingIcon />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-emerald-600">Workspace</p>
              <h3 className="text-lg font-semibold leading-tight text-slate-950">Company Settings</h3>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Manage company name, working hours, and leave policy for the entire CRM workspace.
          </p>

          <form action={settingsAction} className="mt-5 space-y-4">
            {settingsState.error ? <Feedback>{settingsState.error}</Feedback> : null}
            {settingsState.success ? <Feedback tone="success">{settingsState.success}</Feedback> : null}

            <InputField
              defaultValue={settingsState.values?.companyName}
              label="Company Name"
              name="companyName"
              placeholder="Enter company name"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                defaultValue={settingsState.values?.workStart}
                label="Work Start Time"
                name="workStart"
                placeholder="09:00"
                type="time"
              />
              <InputField
                defaultValue={settingsState.values?.workEnd}
                label="Work End Time"
                name="workEnd"
                placeholder="18:00"
                type="time"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                defaultValue={settingsState.values?.workingDays ?? "26"}
                label="Working Days / Month"
                name="workingDays"
                placeholder="26"
                type="number"
              />
              <InputField
                defaultValue={settingsState.values?.salaryDay ?? "1"}
                label="Salary Payment Day"
                name="salaryDay"
                placeholder="1"
                type="number"
              />
              <InputField
                defaultValue={settingsState.values?.lateGraceMinutes ?? "15"}
                label="Late Grace Period (mins)"
                name="lateGraceMinutes"
                placeholder="15"
                type="number"
              />
            </div>

            <TextAreaField
              defaultValue={settingsState.values?.leavePolicy}
              label="Leave Policy"
              name="leavePolicy"
              placeholder="Write a short leave policy for employees"
            />

            {/* ── Geo-fence / Location Attendance ── */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-700">
                  <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
                    <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Z" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </div>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-emerald-700">Location Attendance</p>
                  <p className="text-xs text-emerald-600">Office ki GPS location set karein aur geo-fence enable karein</p>
                </div>
              </div>

              {/* Enable toggle */}
              <GeoFenceToggle
                defaultChecked={settingsState.values?.geoFenceEnabled === "true"}
                name="geoFenceEnabled"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <OptionalInputField
                  defaultValue={settingsState.values?.officeName ?? "Vista Business Tower"}
                  label="Office Building"
                  name="officeName"
                  placeholder="Vista Business Tower"
                />
                <OptionalInputField
                  defaultValue={settingsState.values?.officeAddress ?? ""}
                  label="Office Address"
                  name="officeAddress"
                  placeholder="D270 Phase 8B, Sector 74, Mohali"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <OptionalInputField
                  defaultValue={settingsState.values?.officeLatitude ?? ""}
                  label="Office Latitude"
                  name="officeLatitude"
                  placeholder="e.g. 28.61390"
                />
                <OptionalInputField
                  defaultValue={settingsState.values?.officeLongitude ?? ""}
                  label="Office Longitude"
                  name="officeLongitude"
                  placeholder="e.g. 77.20900"
                />
                <OptionalInputField
                  defaultValue={settingsState.values?.geoFenceRadiusMeters ?? "600"}
                  label="Allowed Radius (meters)"
                  name="geoFenceRadiusMeters"
                  placeholder="600"
                  type="number"
                />
              </div>
              <p className="text-[0.68rem] text-emerald-700/70">
                💡 Tip: Google Maps mein apne office par right-click karein → &quot;What&apos;s here&quot; → latitude/longitude copy karein.
              </p>
            </div>

            <Button className="sm:w-auto" disabled={settingsPending} type="submit">
              {settingsPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </section>

        {/* Holiday Calendar */}
        <section className="rounded-[1.8rem] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] border border-violet-100 bg-violet-50 text-violet-600">
                <CalendarIcon />
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-violet-600">HR Policy</p>
                <h3 className="text-lg font-semibold leading-tight text-slate-950">Holiday Calendar</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHolidayForm((v) => !v)}
              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100 transition"
            >
              {showHolidayForm ? "Cancel" : "+ Add Holiday"}
            </button>
          </div>

          {showHolidayForm && (
            <form action={holidayAddAction} className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 space-y-3">
              {holidayAddState.error ? <Feedback>{holidayAddState.error}</Feedback> : null}
              {holidayAddState.success ? <Feedback tone="success">{holidayAddState.success}</Feedback> : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <InputField label="Holiday Name" name="name" placeholder="e.g. Diwali" />
                <InputField label="Date" name="date" type="date" placeholder="" />
                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700">Type</label>
                  <select name="type" className="w-full rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 text-slate-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
                    {HOLIDAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <InputField label="Description (optional)" name="description" placeholder="Brief note about this holiday" />
              <Button disabled={holidayAddPending} type="submit">
                {holidayAddPending ? "Adding..." : "Add Holiday"}
              </Button>
            </form>
          )}

          {holidayDelState.error ? <div className="mt-2"><Feedback>{holidayDelState.error}</Feedback></div> : null}
          {holidayDelState.success ? <div className="mt-2"><Feedback tone="success">{holidayDelState.success}</Feedback></div> : null}

          <div className="mt-4 divide-y divide-slate-100">
            {data.holidays.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No holidays added for this year yet.</p>
            ) : (
              data.holidays.map((holiday) => (
                <HolidayRow key={holiday.id} holiday={holiday} deleteAction={holidayDelAction} deletePending={holidayDelPending} />
              ))
            )}
          </div>
        </section>
        </>
      ) : null}
    </div>
  );
}

type InputFieldProps = {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
};

function InputField({ defaultValue, label, name, placeholder, type = "text", required = true }: InputFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        className={`w-full rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 ${
          type === "time" ? "[color-scheme:light]" : ""
        }`}
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextAreaField({ defaultValue, label, name, placeholder }: Omit<InputFieldProps, "type">) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}

function PasswordField({ defaultValue, label, name, placeholder }: Omit<InputFieldProps, "type">) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100">
        <input
          className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none"
          defaultValue={defaultValue}
          name={name}
          placeholder={placeholder}
          type={isVisible ? "text" : "password"}
        />
        <button
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="ml-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
          onClick={() => setIsVisible((v) => !v)}
          type="button"
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

function PersonIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.5 20c.9-3.5 3.8-6 7.5-6s6.6 2.5 7.5 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <rect height="11" rx="2.2" stroke="currentColor" strokeWidth="1.7" width="14" x="5" y="11" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <circle cx="12" cy="16.5" fill="currentColor" r="1.2" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M3 21h18M4 21V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="M9 21v-5h6v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M9 8h1.5M9 12h1.5M13.5 8H15M13.5 12H15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <rect height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="4" />
      <path d="M3 9h18M8 2v4M16 2v4M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  PUBLIC: "bg-emerald-100 text-emerald-700",
  OPTIONAL: "bg-amber-100 text-amber-700",
  COMPANY: "bg-violet-100 text-violet-700",
};

function HolidayRow({
  holiday,
  deleteAction,
  deletePending,
}: {
  holiday: HolidayEntry;
  deleteAction: (fd: FormData) => void;
  deletePending: boolean;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="flex items-center justify-between py-3 gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900 text-sm">{holiday.name}</span>
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${HOLIDAY_TYPE_COLORS[holiday.type] ?? "bg-slate-100 text-slate-500"}`}>
            {holiday.type}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{holiday.date}{holiday.description ? ` · ${holiday.description}` : ""}</p>
      </div>
      {confirm ? (
        <form action={deleteAction} className="flex items-center gap-2 shrink-0">
          <input type="hidden" name="holidayId" value={holiday.id} />
          <button type="submit" disabled={deletePending} className="text-xs text-red-600 font-medium hover:text-red-800">Confirm</button>
          <button type="button" onClick={() => setConfirm(false)} className="text-xs text-slate-400">Cancel</button>
        </form>
      ) : (
        <button onClick={() => setConfirm(true)} className="shrink-0 text-xs text-red-400 hover:text-red-600">Remove</button>
      )}
    </div>
  );
}
