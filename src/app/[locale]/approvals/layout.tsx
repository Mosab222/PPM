import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export default async function ApprovalsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/approvals`);
  }

  // Admin gets read-only visibility (handled in the page itself); head and
  // manager get their own actionable queue. Technicians have no business
  // here -- same "redirect away entirely" pattern used between /admin and /tech.
  if (user.role === "technician") {
    redirect(`/${locale}/tech/find`);
  }

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">{children}</div>;
}
