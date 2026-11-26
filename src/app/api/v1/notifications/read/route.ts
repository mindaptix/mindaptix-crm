import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { NotificationModel } from "@/database/mongodb/models/notification";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.map(String).filter(Boolean) : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "At least one notification ID is required." }, { status: 400 });
  }

  await connectDb();
  const result = await NotificationModel.updateMany(
    {
      _id: { $in: ids },
      recipientUserId: session.user.id,
      readAt: null,
    },
    {
      $set: { readAt: new Date() },
    },
  );

  return NextResponse.json({
    success: true,
    updatedCount: result.modifiedCount,
  });
}
