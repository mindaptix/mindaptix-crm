import { jsonError, jsonOk, requireSession } from "@/app/api/v1/_lib/http";
import { checkInAttendance } from "@/features/dashboard/actions/attendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireSession();

  let body: { workMode?: string; lat?: number; lng?: number; accuracy?: number };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON body." });
  }

  const form = new FormData();
  if (body.workMode) form.set("workMode", String(body.workMode));
  if (body.lat !== undefined) form.set("lat", String(body.lat));
  if (body.lng !== undefined) form.set("lng", String(body.lng));
  if (body.accuracy !== undefined) form.set("accuracy", String(body.accuracy));

  const result = await checkInAttendance(form);
  if (result.error) return jsonError(400, { error: result.error });
  return jsonOk({ ok: true });
}

