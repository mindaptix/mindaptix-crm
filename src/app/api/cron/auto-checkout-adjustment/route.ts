import { NextResponse } from "next/server";
import { applyMissedCheckoutAdjustment } from "@/features/notifications/service";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

/** Runs at 10 PM IST (16:30 UTC) to apply the missed-checkout time adjustment. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const date = formatIndiaDateKey();
  const result = await applyMissedCheckoutAdjustment(date);
  return NextResponse.json({ date, ...result });
}
