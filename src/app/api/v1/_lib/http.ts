import { NextResponse } from "next/server";
import { getCurrentSession, type AuthenticatedSession } from "@/features/auth/lib/auth-session";

export type ApiErrorBody = { error: string; code?: string; details?: unknown };

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "private, no-store", ...(init?.headers ?? {}) } });
}

export function jsonError(status: number, body: ApiErrorBody, init?: ResponseInit) {
  return NextResponse.json(body, { status, ...init, headers: { "Cache-Control": "private, no-store", ...(init?.headers ?? {}) } });
}

export async function requireSession(): Promise<AuthenticatedSession> {
  const session = await getCurrentSession();
  if (!session) {
    throw Object.assign(new Error("Unauthorized"), { status: 401, code: "UNAUTHORIZED" as const });
  }
  return session;
}

export function getErrorStatus(error: unknown, fallback = 500) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number" && Number.isFinite(status)) return status;
  }
  return fallback;
}

export function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

