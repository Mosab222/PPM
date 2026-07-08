import { getTranslations, setRequestLocale } from "next-intl/server";
import { TypeAddForm } from "@/components/type-add-form";
import { BackButton } from "@/components/back-button";

export default async function NewTypePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.types.type");

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <h1 className="text-xl font-bold">{t("newTitle")}</h1>
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <TypeAddForm />
      </div>
    </div>
  );
}
