"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { NotificationModel } from "@/database/mongodb/models/notification";

export async function markNotificationsAsRead(notificationIds: string[]) {
  const session = await getCurrentSession();
  if (!session || notificationIds.length === 0) return;

  await connectDb();

  await NotificationModel.updateMany(
    {
      _id: { $in: notificationIds },
      recipientUserId: session.user.id,
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  );

  revalidatePath("/dashboard");
}
