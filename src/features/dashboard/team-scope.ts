import "server-only";

import type { AuthenticatedSession } from "@/features/auth/lib/auth-session";
import { TaskModel } from "@/database/mongodb/models/task";
import { UserModel } from "@/database/mongodb/models/user";

export const STAFF_ATTENDANCE_ROLES = ["EMPLOYEE", "SALES"] as const;

export async function getVisibleUserIdsForSession(
  session: AuthenticatedSession,
  options?: {
    employeesOnly?: boolean;
  },
) {
  if (session.user.role === "SUPER_ADMIN" || session.user.role === "MANAGER") {
    const filter = options?.employeesOnly ? { role: { $in: STAFF_ATTENDANCE_ROLES } } : { role: { $ne: "SUPER_ADMIN" as const } };
    const users = await UserModel.find(filter, { _id: 1 }).lean();
    return users.map((user) => user._id.toString());
  }

  return [session.user.id];
}

export async function getManagerTeamUserIds(managerId: string) {
  const [directReports, legacyTasks] = await Promise.all([
    UserModel.find({ managerId, role: { $in: STAFF_ATTENDANCE_ROLES } }, { _id: 1 }).lean(),
    TaskModel.find({ assignedByUserId: managerId }, { assignedUserId: 1 }).lean(),
  ]);

  const userIds = Array.from(
    new Set([
      ...directReports.map((user) => user._id.toString()),
      ...legacyTasks.map((task) => task.assignedUserId).filter(Boolean),
    ]),
  );

  if (!userIds.length) {
    return [];
  }

  const users = await UserModel.find({ _id: { $in: userIds }, role: { $in: STAFF_ATTENDANCE_ROLES } }, { _id: 1 }).lean();
  return users.map((user) => user._id.toString());
}


