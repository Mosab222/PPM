import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { TechNav } from "@/components/tech-nav";

export default async function TechLayout({
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
    redirect(`/${locale}/login?next=/${locale}/tech/find`);
  }

  if (user.role === "admin") {
    redirect(`/${locale}/admin/dashboard`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row lg:gap-6">
      <TechNav />
      <div className="min-w-0 flex-1 pb-20 lg:pb-6">{children}</div>
    </div>
  );
}
