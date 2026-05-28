import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import connectDb from "@/database/mongodb/connect";
import { normalizeActor, type AppActor } from "@/features/auth/lib/rbac";
import { UserModel, type UserRecord } from "@/database/mongodb/models/user";
import { UserSessionModel } from "@/database/mongodb/models/user-session";

const AUTH_COOKIE_NAME = "mindaptix_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthenticatedSession = {
  sessionId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRecord["role"];
    managerId: string;
    projectIds: string[];
    leadIds: string[];
  };
};

export async function createUserSession(
  user: Pick<UserRecord, "_id" | "fullName" | "email" | "role" | "managerId" | "projectIds" | "leadIds">,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  },
) {
  await connectDb();

  const sessionToken = randomBytes(32).toString("base64url");
  const sessionTokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const session = await UserSessionModel.create({
    userId: user._id,
    sessionTokenHash,
    expiresAt,
    ipAddress: metadata?.ipAddress ?? "",
    userAgent: metadata?.userAgent ?? "",
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return {
    sessionId: session._id.toString(),
    expiresAt,
  };
}

export const getCurrentSession = cache(async (): Promise<AuthenticatedSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getSessionByToken(token);
});

export async function getActorFromSessionToken(token: string | null) {
  if (!token) {
    return null;
  }

  const session = await getSessionByToken(token);

  if (!session) {
    return null;
  }

  return normalizeActor({
    userId: session.user.id,
    role: session.user.role,
    projectIds: session.user.projectIds,
    leadIds: session.user.leadIds,
  });
}

export async function getCurrentActorFromSession(): Promise<AppActor | null> {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return normalizeActor({
    userId: session.user.id,
    role: session.user.role,
    projectIds: session.user.projectIds,
    leadIds: session.user.leadIds,
  });
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    await connectDb();
    await UserSessionModel.deleteOne({ sessionTokenHash: hashSessionToken(token) });
  }

  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(`${token}:${getSessionSecret()}`).digest("hex");
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Please define SESSION_SECRET in your .env file with at least 32 characters.");
  }

  return secret;
}

async function getSessionByToken(token: string): Promise<AuthenticatedSession | null> {
  await connectDb();

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  // Step 1: find session
  const sessionRecord = await UserSessionModel.findOne(
    { sessionTokenHash: tokenHash, expiresAt: { $gt: now } },
    { _id: 1, userId: 1 },
  ).lean();

  if (!sessionRecord) return null;

  // Step 2: fetch only the fields we need from user (projection = faster)
  const user = await UserModel.findById(
    sessionRecord.userId,
    { fullName: 1, email: 1, role: 1, managerId: 1, projectIds: 1, leadIds: 1, status: 1 },
  ).lean<UserRecord | null>();

  if (!user || user.status === "SUSPENDED") return null;

  return {
    sessionId: sessionRecord._id.toString(),
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      managerId: user.managerId ?? "",
      projectIds: user.projectIds ?? [],
      leadIds: user.leadIds ?? [],
    },
  };
}


