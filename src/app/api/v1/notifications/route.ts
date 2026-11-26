import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { NotificationModel } from "@/database/mongodb/models/notification";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "8", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 8, 1), 50);

  await connectDb();
  const notifications = await NotificationModel.find({
    recipientUserId: session.user.id,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      actionUrl: n.actionUrl || "",
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
    })),
  });
}
