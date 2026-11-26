import { requireSession, jsonError, jsonOk } from "@/app/api/v1/_lib/http";
import { getNotificationsForUser } from "@/features/notifications/service";

export async function GET(request: Request) {
  const session = await requireSession();
  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.min(50, Math.max(1, Number(limitRaw ?? 8) || 8));

  try {
    const notifications = await getNotificationsForUser(session.user.id, limit);
    return jsonOk({
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        actionUrl: n.actionUrl ?? "",
        sourceKey: n.sourceKey,
        readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
      })),
    });
  } catch {
    return jsonError(500, { error: "Unable to load notifications." });
  }
}

