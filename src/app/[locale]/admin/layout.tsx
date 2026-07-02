import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Link } from "@/i18n/navigation";

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
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-red-700">{t("notAuthorized")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-4 border-b border-border pb-3">
        <Link href="/admin/dashboard" className="text-sm font-medium text-primary">
          {t("nav.dashboard")}
        </Link>
        <Link href="/admin/equipment" className="text-sm font-medium text-primary">
          {t("nav.equipment")}
        </Link>
        <Link href="/admin/users" className="text-sm font-medium text-primary">
          {t("nav.users")}
        </Link>
        <Link href="/admin/reports" className="text-sm font-medium text-primary">
          {t("nav.reports")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
