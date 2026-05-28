import { redirect } from "next/navigation";
import { ResetPasswordScreen } from "@/features/auth/components/reset-password-screen";
import { getCurrentSession } from "@/features/auth/lib/auth-session";
import connectDb from "@/database/mongodb/connect";
import { PasswordResetTokenModel } from "@/database/mongodb/models/workforce/password-reset-token";
import { createHash } from "node:crypto";

export const metadata = {
  title: "Reset Password — Mindaptix CRM",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

function hashResetToken(token: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`reset:${token}:${secret}`).digest("hex");
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const rawToken = Array.isArray(query.token) ? query.token[0] : (query.token ?? "");

  if (!rawToken) {
    redirect("/forgot-password");
  }

  // Check if token is valid (not expired, not used)
  let isExpired = true;

  try {
    await connectDb();
    const tokenHash = hashResetToken(rawToken);
    const record = await PasswordResetTokenModel.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    }).lean();

    isExpired = !record;
  } catch {
    isExpired = true;
  }

  return <ResetPasswordScreen token={rawToken} isExpired={isExpired} />;
}
