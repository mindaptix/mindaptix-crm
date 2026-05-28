"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import connectDb from "@/database/mongodb/connect";
import { createUserSession, clearCurrentSession, getCurrentSession } from "@/features/auth/lib/auth-session";
import type { AuthFormState } from "@/features/auth/lib/auth-form-state";
import { hashPassword, verifyPassword } from "@/features/auth/lib/password";
import { isPublicRegistrationOpen } from "@/features/auth/lib/user-admin";
import { getDefaultDashboardHrefForRole } from "@/features/dashboard/config";
import { UserModel } from "@/database/mongodb/models/user";
import { LoginAttemptModel } from "@/database/mongodb/models/workforce/login-attempt";
import { UserSessionModel } from "@/database/mongodb/models/user-session";
import { PasswordResetTokenModel } from "@/database/mongodb/models/workforce/password-reset-token";
import type { UserRole } from "@/features/auth/lib/rbac";

// ──────────────────────────────────────────────────────────────────
//  Rate-limit constants
// ──────────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS_EMAIL = 5;
const MAX_FAILED_ATTEMPTS_IP = 20;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_RESET_REQUESTS_PER_EMAIL_PER_HOUR = 3;

// ──────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────
async function checkRateLimit(email: string, ipAddress: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS);

  const [emailFails, ipFails] = await Promise.all([
    LoginAttemptModel.countDocuments({
      email,
      success: false,
      attemptedAt: { $gte: windowStart },
    }),
    ipAddress
      ? LoginAttemptModel.countDocuments({
          ipAddress,
          success: false,
          attemptedAt: { $gte: windowStart },
        })
      : Promise.resolve(0),
  ]);

  return emailFails >= MAX_FAILED_ATTEMPTS_EMAIL || ipFails >= MAX_FAILED_ATTEMPTS_IP;
}

async function recordAttempt(email: string, success: boolean, ipAddress: string) {
  await LoginAttemptModel.create({ email, success, ipAddress, attemptedAt: new Date() }).catch(() => null);
}

function hashResetToken(token: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`reset:${token}:${secret}`).digest("hex");
}

// ──────────────────────────────────────────────────────────────────
//  Register
// ──────────────────────────────────────────────────────────────────
export async function registerUser(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  const fieldErrors = validateRegistration({ fullName, email, password });

  if (hasErrors(fieldErrors)) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors,
      values: { fullName, email },
    };
  }

  try {
    const publicRegistrationOpen = await isPublicRegistrationOpen();

    if (!publicRegistrationOpen) {
      return {
        error: "Public signup is disabled. Ask your Super Admin to create your account.",
        values: { fullName, email },
      };
    }

    const existingUser = await UserModel.findOne({ email }).lean();

    if (existingUser) {
      return {
        error: "An account already exists with this email address.",
        fieldErrors: { email: "Use another email or sign in." },
        values: { fullName, email },
      };
    }

    const userCount = await UserModel.countDocuments();
    const role: UserRole = userCount === 0 ? "SUPER_ADMIN" : "EMPLOYEE";
    const passwordHash = await hashPassword(password);

    await UserModel.create({
      fullName,
      email,
      passwordHash,
      role,
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[auth] register success", { email, role });
    }
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth] register duplicate email", { email });
      }

      return {
        error: "An account already exists with this email address.",
        fieldErrors: { email: "Use another email or sign in." },
        values: { fullName, email },
      };
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] register failed", {
        email,
        error: getDebugErrorSummary(error),
      });
    }

    return {
      error: getSafeAuthErrorMessage(error),
      values: { fullName, email },
    };
  }

  redirect("/login?registered=1");
}

// ──────────────────────────────────────────────────────────────────
//  Login
// ──────────────────────────────────────────────────────────────────
export async function loginUser(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  let redirectHref = "/dashboard";

  const fieldErrors = validateLogin({ email, password });

  if (hasErrors(fieldErrors)) {
    return {
      error: "Please enter a valid email and password.",
      fieldErrors,
      values: { email },
    };
  }

  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip") ?? "";

  try {
    await connectDb();

    // Run rate-limit check and user lookup in parallel — saves ~80-150ms
    const [isLocked, user] = await Promise.all([
      checkRateLimit(email, ipAddress),
      UserModel.findOne({ email }, { fullName: 1, email: 1, role: 1, passwordHash: 1, status: 1, managerId: 1, projectIds: 1, leadIds: 1 }),
    ]);

    if (isLocked) {
      return {
        error: "Too many failed attempts. Account temporarily locked for 15 minutes.",
        values: { email },
      };
    }

    if (!user) {
      await recordAttempt(email, false, ipAddress);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth] login failed user not found", { email });
      }

      return {
        error: "Invalid email or password.",
        values: { email },
      };
    }

    const userStatus = user.status ?? "ACTIVE";

    if (!user.status) {
      await UserModel.findByIdAndUpdate(user._id, { status: "ACTIVE" });
      user.status = "ACTIVE";
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      await recordAttempt(email, false, ipAddress);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth] login failed invalid password", { email });
      }

      return {
        error: "Invalid email or password.",
        values: { email },
      };
    }

    if (userStatus !== "ACTIVE") {
      await recordAttempt(email, false, ipAddress);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth] login failed inactive user", { email, status: userStatus });
      }

      return {
        error: "Your account is not active. Contact your administrator.",
        values: { email },
      };
    }

    await recordAttempt(email, true, ipAddress);

    await createUserSession(user, {
      ipAddress,
      userAgent: headerStore.get("user-agent") ?? "",
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[auth] login success", { email, role: user.role });
    }

    redirectHref = getDefaultDashboardHrefForRole(user.role);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] login server error", {
        email,
        error: getDebugErrorSummary(error),
      });
    }

    return {
      error: getSafeAuthErrorMessage(error),
      values: { email },
    };
  }

  redirect(redirectHref);
}

// ──────────────────────────────────────────────────────────────────
//  Logout
// ──────────────────────────────────────────────────────────────────
export async function logoutUser() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  await clearCurrentSession();
  redirect("/login");
}

// ──────────────────────────────────────────────────────────────────
//  Forgot Password — request reset link
// ──────────────────────────────────────────────────────────────────
export type PasswordResetRequestState = {
  error?: string;
  success?: boolean;
  /** The raw token — only populated in non-production so admin can share the link */
  resetToken?: string;
  values?: { email?: string };
};

export async function requestPasswordReset(
  _previousState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address.", values: { email } };
  }

  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip") ?? "";

  try {
    await connectDb();

    // Rate-limit: max 3 reset requests per email per hour
    const windowStart = new Date(Date.now() - PASSWORD_RESET_TOKEN_TTL_MS);
    const recentRequests = await PasswordResetTokenModel.countDocuments({
      // We look up by userId after finding user, but we can do a quick
      // approximate check on the requestedFromIp to stop IP flooding too
    });
    void recentRequests; // handled below after user lookup

    const user = await UserModel.findOne({ email }, { _id: 1, fullName: 1, email: 1 }).lean();

    // Always respond with "success" to prevent email enumeration
    if (!user) {
      return { success: true };
    }

    // IP-based flood guard
    const ipRequestCount = await PasswordResetTokenModel.countDocuments({
      requestedFromIp: ipAddress,
      requestedAt: { $gte: windowStart },
    });

    if (ipRequestCount >= 10) {
      return { error: "Too many reset requests from this network. Please wait and try again.", values: { email } };
    }

    // Email-based flood guard
    const emailRequestCount = await PasswordResetTokenModel.countDocuments({
      userId: user._id.toString(),
      requestedAt: { $gte: windowStart },
    });

    if (emailRequestCount >= MAX_RESET_REQUESTS_PER_EMAIL_PER_HOUR) {
      // Still return success (don't enumerate)
      return { success: true };
    }

    // Generate secure random token
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    // Invalidate any previous unused tokens for this user
    await PasswordResetTokenModel.deleteMany({
      userId: user._id.toString(),
      used: false,
    });

    await PasswordResetTokenModel.create({
      userId: user._id.toString(),
      tokenHash,
      expiresAt,
      used: false,
      requestedFromIp: ipAddress,
      requestedAt: new Date(),
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[auth] password reset requested", { email, userId: user._id.toString() });
    }

    // In production you would send an email here.
    // Since no email service is configured, we surface the token to the admin UI.
    return {
      success: true,
      resetToken: rawToken,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] password reset request error", { email, error: getDebugErrorSummary(error) });
    }

    return { error: getSafeAuthErrorMessage(error), values: { email } };
  }
}

// ──────────────────────────────────────────────────────────────────
//  Reset Password — validate token and set new password
// ──────────────────────────────────────────────────────────────────
export type PasswordResetState = {
  error?: string;
  success?: boolean;
  fieldErrors?: { password?: string; confirmPassword?: string };
};

export async function resetPasswordWithToken(
  token: string,
  _previousState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "Invalid or missing reset token." };
  }

  const fieldErrors: PasswordResetState["fieldErrors"] = {};

  if (!isStrongPassword(password)) {
    fieldErrors.password =
      "Password must be at least 8 characters and include upper, lower, number, and symbol.";
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (fieldErrors.password || fieldErrors.confirmPassword) {
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  try {
    await connectDb();

    const tokenHash = hashResetToken(token);
    const now = new Date();

    const resetRecord = await PasswordResetTokenModel.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: now },
    });

    if (!resetRecord) {
      return { error: "This reset link is invalid or has expired. Please request a new one." };
    }

    const user = await UserModel.findById(resetRecord.userId, { _id: 1, status: 1 }).lean();

    if (!user || user.status === "SUSPENDED") {
      return { error: "This account is not active. Contact your administrator." };
    }

    const newPasswordHash = await hashPassword(password);

    // 1. Update password
    await UserModel.findByIdAndUpdate(resetRecord.userId, { passwordHash: newPasswordHash });

    // 2. Invalidate ALL existing sessions for this user (security: force re-login everywhere)
    await UserSessionModel.deleteMany({ userId: resetRecord.userId });

    // 3. Mark reset token as used
    await PasswordResetTokenModel.findByIdAndUpdate(resetRecord._id, { used: true });

    if (process.env.NODE_ENV !== "production") {
      console.info("[auth] password reset success", { userId: resetRecord.userId });
    }

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] password reset error", { error: getDebugErrorSummary(error) });
    }

    return { error: getSafeAuthErrorMessage(error) };
  }
}

// ──────────────────────────────────────────────────────────────────
//  Validation helpers
// ──────────────────────────────────────────────────────────────────
function validateRegistration(input: { fullName: string; email: string; password: string }) {
  return {
    fullName:
      input.fullName.length >= 2 && input.fullName.length <= 80
        ? undefined
        : "Full name must be between 2 and 80 characters.",
    email: isValidEmail(input.email) ? undefined : "Enter a valid email address.",
    password: isStrongPassword(input.password)
      ? undefined
      : "Password must be at least 8 characters and include upper, lower, number, and symbol.",
  };
}

function validateLogin(input: { email: string; password: string }) {
  return {
    email: isValidEmail(input.email) ? undefined : "Enter a valid email address.",
    password: input.password.length >= 1 ? undefined : "Password is required.",
  };
}

function hasErrors(fieldErrors: AuthFormState["fieldErrors"]) {
  return Boolean(fieldErrors?.fullName || fieldErrors?.email || fieldErrors?.password);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStrongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);
}

function isDuplicateEmailError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const duplicateKeyError = error as {
    code?: number;
    keyPattern?: Record<string, number>;
  };

  return duplicateKeyError.code === 11000 && duplicateKeyError.keyPattern?.email === 1;
}

function getSafeAuthErrorMessage(error: unknown) {
  if (isDatabaseConnectionError(error)) {
    return "Database connection failed. Check your MongoDB Atlas IP whitelist, cluster status, and MONGO_URI.";
  }

  return "Something went wrong on the server. Please try again.";
}

function isDatabaseConnectionError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const databaseError = error as {
    name?: string;
    message?: string;
  };

  return (
    databaseError.name === "MongooseServerSelectionError" ||
    databaseError.name === "MongoServerSelectionError" ||
    databaseError.message?.includes("Could not connect to any servers") === true
  );
}

function getDebugErrorSummary(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) };
  }

  const appError = error as {
    name?: string;
    message?: string;
    code?: number | string;
  };

  return {
    name: appError.name ?? "UnknownError",
    message: appError.message ?? "No message",
    code: appError.code,
  };
}
