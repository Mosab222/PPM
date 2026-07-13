import { setRequestLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");
  const tHome = await getTranslations("home");
  const user = await getCurrentUser();

  const name = user
    ? (locale === "ar" ? user.arabic_name : user.full_name) ||
      user.full_name ||
      user.arabic_name ||
      user.email
    : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-2 py-16 text-center">
      <h1 className="text-3xl font-bold">{t("name")}</h1>
      <p className="text-muted">{t("tagline")}</p>

      <div className="mt-8 w-full rounded-lg border border-border bg-card p-6">
        {!user && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted">{tHome("welcomeLoggedOut")}</p>
            <Link
              href="/login"
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
            >
              {tHome("loginButton")}
            </Link>
          </div>
        )}

        {user && user.role === "admin" && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted">{tHome("welcomeBack", { name: name ?? "" })}</p>
            <Link
              href="/admin/dashboard"
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
            >
              {tHome("goToDashboard")}
            </Link>
          </div>
        )}

        {user && user.role === "technician" && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted">{tHome("welcomeBack", { name: name ?? "" })}</p>
            <Link
              href="/tech/find"
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
            >
              {tHome("goToArea")}
            </Link>
            <p className="text-xs text-muted">{tHome("scanHint")}</p>
          </div>
        )}

        {user && (user.role === "head" || user.role === "manager") && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted">{tHome("welcomeBack", { name: name ?? "" })}</p>
            <Link
              href="/approvals"
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
            >
              {tHome("goToApprovals")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
