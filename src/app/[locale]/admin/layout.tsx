import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { AdminNav } from "@/components/admin-nav";
import { SIDEBAR_COLLAPSE_COOKIE } from "@/lib/sidebar-cookie";

export default async function AdminLayout({
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
    redirect(`/${locale}/login?next=/${locale}/admin/equipment`);
  }

  const t = await getTranslations("admin");

  if (user.role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-4xl rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-red-700">{t("notAuthorized")}</p>
      </div>
    );
  }

  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COLLAPSE_COOKIE)?.value === "1";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row lg:gap-6">
      <AdminNav initialCollapsed={sidebarCollapsed} />
      <div className="min-w-0 flex-1 pb-20 lg:pb-6">{children}</div>
    </div>
  );
}
