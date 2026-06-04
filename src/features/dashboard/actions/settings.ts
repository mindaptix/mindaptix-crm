"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { hashPassword, verifyPassword } from "@/features/auth/lib/password";
import connectDb from "@/database/mongodb/connect";
import { SettingModel } from "@/database/mongodb/models/setting";
import { UserModel } from "@/database/mongodb/models/user";
import { AuditLogModel } from "@/database/mongodb/models/system/audit-log";
import { UserSessionModel } from "@/database/mongodb/models/user-session";
import { headers } from "next/headers";

type SettingsState = {
  error?: string;
  success?: string;
  values?: {
    companyName?: string;
    workStart?: string;
    workEnd?: string;
    leavePolicy?: string;
    workingDays?: string;
    salaryDay?: string;
    lateGraceMinutes?: string;
    officeName?: string;
    officeAddress?: string;
    officeLatitude?: string;
    officeLongitude?: string;
    geoFenceRadiusMeters?: string;
    geoFenceEnabled?: string;
  };
};

export async function updateCompanySettings(
  _previousState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await getCurrentSession();

  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN")) {
    return { error: "Only leadership accounts can update company settings." };
  }

  const companyName = String(formData.get("companyName") ?? "").trim();
  const workStart = String(formData.get("workStart") ?? "").trim();
  const workEnd = String(formData.get("workEnd") ?? "").trim();
  const leavePolicy = String(formData.get("leavePolicy") ?? "").trim();
  const workingDays = parseInt(String(formData.get("workingDays") ?? "26"), 10);
  const salaryDay = parseInt(String(formData.get("salaryDay") ?? "1"), 10);
  const lateGraceMinutes = parseInt(String(formData.get("lateGraceMinutes") ?? "15"), 10);
  const officeName = String(formData.get("officeName") ?? "").trim();
  const officeAddress = String(formData.get("officeAddress") ?? "").trim();
  const officeLatitudeRaw = String(formData.get("officeLatitude") ?? "").trim();
  const officeLongitudeRaw = String(formData.get("officeLongitude") ?? "").trim();
  const geoFenceRadiusMeters = parseInt(String(formData.get("geoFenceRadiusMeters") ?? "1000"), 10);
  const geoFenceEnabled = formData.get("geoFenceEnabled") === "true";
  const officeLatitude = officeLatitudeRaw !== "" ? parseFloat(officeLatitudeRaw) : null;
  const officeLongitude = officeLongitudeRaw !== "" ? parseFloat(officeLongitudeRaw) : null;

  if (companyName.length < 2 || !/^\d{2}:\d{2}$/.test(workStart) || !/^\d{2}:\d{2}$/.test(workEnd)) {
    return {
      error: "Enter company name and valid working hours.",
      values: { companyName, workStart, workEnd, leavePolicy },
    };
  }

  if (geoFenceEnabled && (officeLatitude === null || officeLongitude === null || isNaN(officeLatitude) || isNaN(officeLongitude))) {
    return {
      error: "Office latitude and longitude are required when location-based attendance is enabled.",
      values: { companyName, workStart, workEnd, leavePolicy, officeLatitude: officeLatitudeRaw, officeLongitude: officeLongitudeRaw, geoFenceEnabled: "true" },
    };
  }

  await connectDb();

  await SettingModel.findOneAndUpdate(
    { key: "company" },
    {
      companyName,
      workStart,
      workEnd,
      leavePolicy: leavePolicy || "Paid Leave and Sick Leave are available for approved requests.",
      workingDays: isNaN(workingDays) ? 26 : workingDays,
      salaryDay: isNaN(salaryDay) ? 1 : salaryDay,
      lateGraceMinutes: isNaN(lateGraceMinutes) ? 15 : lateGraceMinutes,
      officeName: officeName || "Vista Business Tower",
      officeAddress:
        officeAddress ||
        "D270 Phase, 8B, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Punjab 140307",
      officeLatitude,
      officeLongitude,
      geoFenceRadiusMeters: isNaN(geoFenceRadiusMeters) ? 1000 : geoFenceRadiusMeters,
      geoFenceEnabled,
    },
    { upsert: true, new: true },
  );

  const headerStore = await headers();
  await AuditLogModel.create({
    actorUserId: session.user.id,
    actorName: session.user.fullName,
    actorRole: session.user.role,
    action: "SETTINGS_UPDATED",
    targetName: companyName,
    detail: `workStart=${workStart}, workEnd=${workEnd}, workingDays=${workingDays}`,
    ipAddress: headerStore.get("x-forwarded-for") ?? "",
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/reports");

  return {
    success: "Settings updated successfully.",
    values: {
      companyName,
      workStart,
      workEnd,
      leavePolicy,
      workingDays: String(workingDays),
      salaryDay: String(salaryDay),
      lateGraceMinutes: String(lateGraceMinutes),
      officeName: officeName || "Vista Business Tower",
      officeAddress:
        officeAddress ||
        "D270 Phase, 8B, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Punjab 140307",
      officeLatitude: officeLatitude !== null ? String(officeLatitude) : "",
      officeLongitude: officeLongitude !== null ? String(officeLongitude) : "",
      geoFenceRadiusMeters: String(isNaN(geoFenceRadiusMeters) ? 1000 : geoFenceRadiusMeters),
      geoFenceEnabled: String(geoFenceEnabled),
    },
  };
}

type ProfileSettingsState = {
  error?: string;
  success?: string;
  values?: {
    fullName?: string;
    email?: string;
    phone?: string;
    designation?: string;
    department?: string;
    dateOfBirth?: string;
    address?: string;
    emergencyContact?: string;
  };
};

export async function updateAccountProfile(
  _previousState: ProfileSettingsState,
  formData: FormData,
): Promise<ProfileSettingsState> {
  const session = await getCurrentSession();

  if (!session) {
    return { error: "Please sign in again to update your profile." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim();

  if (fullName.length < 2) {
    return { error: "Full name must be at least 2 characters.", values: { fullName, email, phone, designation, department, dateOfBirth, address, emergencyContact } };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", values: { fullName, email, phone, designation, department, dateOfBirth, address, emergencyContact } };
  }

  if (phone && !/^[0-9+\-()\s]{7,20}$/.test(phone)) {
    return { error: "Enter a valid phone number.", values: { fullName, email, phone, designation, department, dateOfBirth, address, emergencyContact } };
  }

  await connectDb();

  const existing = await UserModel.findOne({ email, _id: { $ne: session.user.id } }).lean();
  if (existing) {
    return { error: "This email is already in use by another account.", values: { fullName, email, phone, designation, department, dateOfBirth, address, emergencyContact } };
  }

  await UserModel.findByIdAndUpdate(session.user.id, {
    fullName,
    email,
    phone,
    designation,
    department,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    address,
    emergencyContact,
  });

  revalidatePath("/dashboard/settings");

  return { success: "Profile updated successfully.", values: { fullName, email, phone, designation, department, dateOfBirth, address, emergencyContact } };
}

type PasswordSettingsState = {
  error?: string;
  success?: string;
  values?: {
    confirmPassword?: string;
    currentPassword?: string;
    newPassword?: string;
  };
};

export async function updateAccountPassword(
  _previousState: PasswordSettingsState,
  formData: FormData,
): Promise<PasswordSettingsState> {
  const session = await getCurrentSession();

  if (!session) {
    return { error: "Please sign in again to update your password." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!newPassword || !confirmPassword) {
    return {
      error: "Enter new password and confirm password.",
      values: { confirmPassword, currentPassword, newPassword },
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error: "New password and confirm password do not match.",
      values: { confirmPassword, currentPassword, newPassword },
    };
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(newPassword)) {
    return {
      error: "Use 8+ characters with uppercase, lowercase, number, and special character.",
      values: { confirmPassword, currentPassword, newPassword },
    };
  }

  await connectDb();

  if (currentPassword) {
    const user = await UserModel.findById(session.user.id, { passwordHash: 1 }).lean();

    if (!user?.passwordHash) {
      return {
        error: "Unable to verify the current password right now.",
        values: { confirmPassword, currentPassword, newPassword },
      };
    }

    const isValidCurrentPassword = await verifyPassword(currentPassword, user.passwordHash);

    if (!isValidCurrentPassword) {
      return {
        error: "Current password is not correct.",
        values: { confirmPassword, currentPassword, newPassword },
      };
    }
  }

  const passwordHash = await hashPassword(newPassword);

  // Update password + invalidate all OTHER active sessions (force re-login on other devices)
  const currentSessionId = session.sessionId;
  await Promise.all([
    UserModel.findByIdAndUpdate(session.user.id, { passwordHash }),
    UserSessionModel.deleteMany({
      userId: session.user.id,
      // Keep the current session alive so user stays logged in after change
      _id: { $ne: currentSessionId },
    }),
  ]);

  revalidatePath("/dashboard/settings");

  return {
    success: "Password updated successfully. All other devices have been signed out.",
    values: { confirmPassword: "", currentPassword: "", newPassword: "" },
  };
}


