import { headers } from "next/headers";
import { NextResponse } from "next/server";
import connectDb from "@/database/mongodb/connect";
import { UserModel } from "@/database/mongodb/models/user";
import { LoginAttemptModel } from "@/database/mongodb/models/workforce/login-attempt";
import { createUserSession } from "@/features/auth/lib/auth-session";
import { verifyPassword } from "@/features/auth/lib/password";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip") ?? "";
  const userAgent = headerStore.get("user-agent") ?? "Mindaptix CRM Mobile (v1)";

  await connectDb();
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  const [emailFailures, ipFailures, user] = await Promise.all([
    LoginAttemptModel.countDocuments({ email, success: false, attemptedAt: { $gte: windowStart } }),
    ipAddress ? LoginAttemptModel.countDocuments({ ipAddress, success: false, attemptedAt: { $gte: windowStart } }) : Promise.resolve(0),
    UserModel.findOne(
      { email },
      { fullName: 1, email: 1, role: 1, passwordHash: 1, status: 1, managerId: 1, projectIds: 1, leadIds: 1, profilePhotoUrl: 1 },
    ),
  ]);

  if (emailFailures >= 5 || ipFailures >= 20) {
    return NextResponse.json(
      { error: "Too many failed attempts. Account temporarily locked for 15 minutes." },
      { status: 429 },
    );
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await LoginAttemptModel.create({ email, success: false, ipAddress, attemptedAt: new Date() }).catch(() => null);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if ((user.status ?? "ACTIVE") !== "ACTIVE") {
    return NextResponse.json({ error: "Your account is not active. Contact your administrator." }, { status: 403 });
  }

  await LoginAttemptModel.create({ email, success: true, ipAddress, attemptedAt: new Date() }).catch(() => null);
  const sessionData = await createUserSession(user, {
    ipAddress,
    userAgent,
  });

  return NextResponse.json({
    sessionId: sessionData.sessionId,
    expiresAt: sessionData.expiresAt.toISOString(),
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      managerId: user.managerId ? user.managerId.toString() : "",
      projectIds: (user.projectIds ?? []).map((id: unknown) => String(id)),
      leadIds: (user.leadIds ?? []).map((id: unknown) => String(id)),
    },
  });
}
