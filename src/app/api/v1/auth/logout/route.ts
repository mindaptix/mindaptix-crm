import { NextResponse } from "next/server";
import { clearCurrentSession } from "@/features/auth/lib/auth-session";

export async function POST() {
  await clearCurrentSession();
  return NextResponse.json({ ok: true });
}
