import { redirect } from "next/navigation";
import { ForgotPasswordScreen } from "@/features/auth/components/forgot-password-screen";
import { getCurrentSession } from "@/features/auth/lib/auth-session";

export const metadata = {
  title: "Forgot Password — Mindaptix CRM",
};

export default async function ForgotPasswordPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return <ForgotPasswordScreen />;
}
