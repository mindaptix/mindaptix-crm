"use server";

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
import type { UserRole } from "@/features/auth/lib/rbac";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

async function checkRateLimit(email: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const recentFails = await LoginAttemptModel.countDocuments({
    email,
    success: false,
    attemptedAt: { $gte: windowStart },
  });
  return recentFails >= MAX_FAILED_ATTEMPTS;
}

async function recordAttempt(email: string, success: boolean, ipAddress: string) {
  await LoginAttemptModel.create({ email, success, ipAddress, attemptedAt: new Date() }).catch(() => null);
}

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
  const ipAddress = headerStore.get("x-forwarded-for") ?? "";

  try {
    await connectDb();

    const isLocked = await checkRateLimit(email);
    if (isLocked) {
      return {
        error: "Too many failed attempts. Account temporarily locked for 15 minutes.",
        values: { email },
      };
    }

    const user = await UserModel.findOne({ email });

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

export async function logoutUser() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  await clearCurrentSession();
  redirect("/login");
}

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



