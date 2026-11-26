import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";

export async function GET() {
  const session = await getCurrentSession();
  return NextResponse.json({
    session: session ?? null,
  });
}
