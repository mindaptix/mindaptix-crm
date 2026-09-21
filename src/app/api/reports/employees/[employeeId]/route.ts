import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getEmployeeExport } from "@/features/reports/server/employee-report";
import { buildEmployeeWorkbook } from "@/features/reports/workbook";
import { monthRange } from "@/features/reports/report-model";
import { formatIndiaDateKey } from "@/shared/lib/india-time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Please sign in again." }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER") {
    return Response.json({ error: "Only admins can download employee reports." }, { status: 403 });
  }
  const { employeeId } = await params;
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^[a-f\d]{24}$/i.test(employeeId) || !monthRange(month, formatIndiaDateKey())) {
    return Response.json({ error: "Select a valid employee and report month." }, { status: 400 });
  }
  try {
    const report = await getEmployeeExport(session, employeeId, month);
    if (!report) return Response.json({ error: "Employee not found." }, { status: 404 });
    const buffer = await buildEmployeeWorkbook(report);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="employee-${employeeId}-${month}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ error: "Report download failed. Please try again." }, { status: 500 });
  }
}
