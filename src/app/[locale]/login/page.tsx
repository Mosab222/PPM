import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    redirect(next && next.startsWith("/") ? next : `/${locale}`);
  }

  const t = await getTranslations("auth");

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="mb-6 text-center text-xl font-bold">{t("title")}</h1>
        <LoginForm locale={locale} redirectTo={next ?? null} />
      </div>
    </div>
  );
}
