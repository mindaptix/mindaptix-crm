import { redirect } from "next/navigation";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import { getPaymentsPageData } from "@/features/dashboard/data";
import { ClientPaymentsPanel } from "@/features/dashboard/components/client-payments-panel";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  const data = await getPaymentsPageData(session);

  return <ClientPaymentsPanel data={data} />;
}
