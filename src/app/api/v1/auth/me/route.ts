import { jsonOk } from "@/app/api/v1/_lib/http";
import { getCurrentSession } from "@/features/auth/lib/auth-session";

export async function GET() {
  const session = await getCurrentSession();
  return jsonOk({ session });
}

