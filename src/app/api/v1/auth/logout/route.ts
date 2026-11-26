import { jsonError, jsonOk, requireSession, getErrorStatus, getErrorCode } from "@/app/api/v1/_lib/http";
import { clearCurrentSession } from "@/features/auth/lib/auth-session";

export async function POST() {
  try {
    await requireSession();
    await clearCurrentSession();
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(getErrorStatus(error), { error: error instanceof Error ? error.message : "Logout failed.", code: getErrorCode(error) });
  }
}

