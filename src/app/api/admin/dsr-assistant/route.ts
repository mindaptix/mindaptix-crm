import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { answerDsrQuestion, AssistantError } from "@/features/admin-assistant/server/dsr-assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

function isSameRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const expectedOrigin = `${forwardedProtocol === "http" ? "http" : "https"}://${forwardedHost || requestUrl.host}`;
  return origin === expectedOrigin || origin === requestUrl.origin;
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) throw new AssistantError("Please sign in again.", 401);
    if (session.user.role !== "SUPER_ADMIN") throw new AssistantError("Only super admins can use the DSR assistant.", 403);
    if (!isSameRequestOrigin(request)) throw new AssistantError("Cross-origin assistant requests are not allowed.", 403);
    const body = await request.json() as { question?: unknown };
    if (typeof body.question !== "string") throw new AssistantError("Ask a DSR question.");
    return Response.json(await answerDsrQuestion(body.question), { headers });
  } catch (error) {
    const message = error instanceof AssistantError ? error.message : "The DSR assistant could not answer right now. Try again.";
    const status = error instanceof AssistantError ? error.status : 502;
    return Response.json({ error: message }, { status, headers });
  }
}
