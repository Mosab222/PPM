import { getTranslations, setRequestLocale } from "next-intl/server";
import { LinkUserForm } from "@/components/link-user-form";

export default async function NewUserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.users.new");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <LinkUserForm locale={locale} />
      </div>
    </div>
  );
}
