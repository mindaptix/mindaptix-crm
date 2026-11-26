import { headers } from "next/headers";
import connectDb from "@/database/mongodb/connect";
import { LoginAttemptModel } from "@/database/mongodb/models/workforce/login-attempt";
import { UserModel } from "@/database/mongodb/models/user";
import { createUserSession } from "@/features/auth/lib/auth-session";
import { verifyPassword } from "@/features/auth/lib/password";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

const MAX_FAILED_ATTEMPTS_EMAIL = 5;
const MAX_FAILED_ATTEMPTS_IP = 20;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function checkRateLimit(email: string, ipAddress: string) {
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const [emailFails, ipFails] = await Promise.all([
    LoginAttemptModel.countDocuments({ email, success: false, attemptedAt: { $gte: windowStart } }),
    ipAddress ? LoginAttemptModel.countDocuments({ ipAddress, success: false, attemptedAt: { $gte: windowStart } }) : Promise.resolve(0),
  ]);
  return emailFails >= MAX_FAILED_ATTEMPTS_EMAIL || ipFails >= MAX_FAILED_ATTEMPTS_IP;
}
async function recordAttempt(email: string, success: boolean, ipAddress: string) {
  await LoginAttemptModel.create({ email, success, ipAddress, attemptedAt: new Date() }).catch(() => null);
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON body." });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  if (!isValidEmail(email) || password.length < 1) {
    return jsonError(400, { error: "Email and password are required." });
  }

  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip") ?? "";
  const userAgent = headerStore.get("user-agent") ?? "";

  try {
    await connectDb();

    const [isLocked, user] = await Promise.all([
      checkRateLimit(email, ipAddress),
      UserModel.findOne({ email }, { fullName: 1, email: 1, role: 1, passwordHash: 1, status: 1, managerId: 1, projectIds: 1, leadIds: 1 }).lean(),
    ]);

    if (isLocked) return jsonError(429, { error: "Too many failed attempts. Try again later.", code: "LOCKED" });
    if (!user) {
      await recordAttempt(email, false, ipAddress);
      return jsonError(401, { error: "Invalid email or password.", code: "INVALID_CREDENTIALS" });
    }

    if ((user.status ?? "ACTIVE") !== "ACTIVE") {
      await recordAttempt(email, false, ipAddress);
      return jsonError(403, { error: "Your account is not active. Contact your administrator.", code: "INACTIVE_USER" });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      await recordAttempt(email, false, ipAddress);
      return jsonError(401, { error: "Invalid email or password.", code: "INVALID_CREDENTIALS" });
    }

    await recordAttempt(email, true, ipAddress);
    const { sessionId, expiresAt } = await createUserSession(
      {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        managerId: user.managerId ?? "",
        projectIds: user.projectIds ?? [],
        leadIds: user.leadIds ?? [],
      },
      { ipAddress, userAgent },
    );

    return jsonOk({
      sessionId,
      expiresAt,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        managerId: user.managerId ?? "",
        projectIds: user.projectIds ?? [],
        leadIds: user.leadIds ?? [],
      },
    });
  } catch {
    return jsonError(500, { error: "Login failed. Please try again.", code: "LOGIN_FAILED" });
  }
}

