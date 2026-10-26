import { NextResponse } from "next/server";
import { applyCommitmentDeductions } from "@/features/tasks/commitment-deductions";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await applyCommitmentDeductions());
}
