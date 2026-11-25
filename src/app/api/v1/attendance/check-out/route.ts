import { jsonError, jsonOk, requireSession } from "@/app/api/v1/_lib/http";
import { checkOutAttendance } from "@/features/dashboard/actions/attendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireSession();

  let body: { lat?: number; lng?: number; accuracy?: number; pendingTaskReason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // allow empty body
  }

  const form = new FormData();
  if (body.lat !== undefined) form.set("lat", String(body.lat));
  if (body.lng !== undefined) form.set("lng", String(body.lng));
  if (body.accuracy !== undefined) form.set("accuracy", String(body.accuracy));
  if (body.pendingTaskReason) form.set("pendingTaskReason", String(body.pendingTaskReason));

  const result = await checkOutAttendance(form);
  if (result.error) return jsonError(400, { error: result.error });
  return jsonOk({ ok: true });
}

