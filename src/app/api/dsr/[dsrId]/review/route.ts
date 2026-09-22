import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getDsrReview, runDsrReview, ReviewError } from "@/features/dsr-review/server/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ dsrId: string }> };

async function authorize() {
  const session = await getCurrentSession();
  if (!session) throw new ReviewError("Please sign in again.", 401);
  if (!["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) throw new ReviewError("Only admins can review DSR evidence.", 403);
  return session;
}
function failure(error: unknown) {
  return Response.json({ error: error instanceof ReviewError ? error.message : "Unable to load or run the review. Try again later." }, { status: error instanceof ReviewError ? error.status : 500, headers });
}
export async function GET(_request: Request, context: Context) {
  try {
    const session = await authorize();
    const { dsrId } = await context.params;
    return Response.json(await getDsrReview(session, dsrId), { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const session = await authorize();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new ReviewError("Cross-origin reviews are not allowed.", 403);
    let body: { confirmAuthor?: boolean; refresh?: boolean };
    try { body = await request.json(); } catch { throw new ReviewError("Invalid review request."); }
    if (!body || body.confirmAuthor !== true) throw new ReviewError("Confirm that the GitHub account belongs to this employee before reviewing.");
    const { dsrId } = await context.params;
    return Response.json({ result: await runDsrReview(session, dsrId, body.refresh === true) }, { headers });
  } catch (error) { return failure(error); }
}
