import { jsonError, jsonOk, requireSession } from "@/app/api/v1/_lib/http";
import { cancelCheckout } from "@/features/dashboard/actions/attendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await requireSession();
  const result = await cancelCheckout();
  if (result.error) return jsonError(400, { error: result.error });
  return jsonOk({ ok: true });
}

