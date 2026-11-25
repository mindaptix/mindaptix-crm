import { jsonError, jsonOk, requireSession } from "@/app/api/v1/_lib/http";
import { getCheckoutPendingTasks } from "@/features/dashboard/actions/attendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession();
  const result = await getCheckoutPendingTasks();
  if (result.error) return jsonError(401, { error: result.error });
  return jsonOk({ tasks: result.tasks });
}

