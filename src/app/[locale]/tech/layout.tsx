import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { TechNav } from "@/components/tech-nav";
import { SIDEBAR_COLLAPSE_COOKIE } from "@/lib/sidebar-cookie";

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

  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COLLAPSE_COOKIE)?.value === "1";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row lg:gap-6">
      <TechNav initialCollapsed={sidebarCollapsed} />
      <div className="min-w-0 flex-1 pb-20 lg:pb-6">{children}</div>
    </div>
  );
}
