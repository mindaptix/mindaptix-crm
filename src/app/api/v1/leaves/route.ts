import { NextResponse } from "next/server";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getLeavesPageData } from "@/features/dashboard/server/page-data";
import { applyLeaveRequest } from "@/features/dashboard/actions/leaves";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const data = await getLeavesPageData(session);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const formData = new FormData();
  if (body.leaveType) formData.append("leaveType", body.leaveType);
  if (body.startDate) formData.append("startDate", body.startDate);
  if (body.endDate) formData.append("endDate", body.endDate);
  if (body.reason) formData.append("reason", body.reason);

  const result = await applyLeaveRequest({}, formData);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: result.success ?? "Leave request submitted." });
}
