import { requireSession, jsonError, jsonOk } from "@/app/api/v1/_lib/http";
import { markNotificationsAsRead } from "@/features/dashboard/actions/notifications";

export async function POST(request: Request) {
  await requireSession();
  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON body." });
  }
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id)).filter(Boolean) : [];
  if (!ids.length) return jsonOk({ ok: true });
  await markNotificationsAsRead(ids);
  return jsonOk({ ok: true });
}

