import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { cancelCheckout } from "@/features/dashboard/actions/attendance";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const result = await cancelCheckout();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
