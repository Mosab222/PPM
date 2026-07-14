import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { AccountSignatureForm } from "@/components/account-signature-form";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const tRole = await getTranslations("admin.users.role_value");

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-sm">
        <p>
          <span className="text-muted">{t("name")}: </span>
          {user.full_name ?? user.arabic_name ?? "—"}
        </p>
        <p>
          <span className="text-muted">{t("email")}: </span>
          {user.email}
        </p>
        <p>
          <span className="text-muted">{t("role")}: </span>
          {tRole(user.role)}
        </p>
      </div>

      {user.role === "admin" ? (
        <p className="text-sm text-muted">{t("adminNoSignature")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("signature.title")}</h2>
          <p className="text-sm text-muted">{t("signature.hint")}</p>
          <AccountSignatureForm userId={user.id} currentSignatureUrl={user.signature_url} />
        </div>
      )}
    </div>
  );
}
