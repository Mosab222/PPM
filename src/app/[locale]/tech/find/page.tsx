import { getTranslations, setRequestLocale } from "next-intl/server";
import { FindEquipmentForm } from "@/components/find-equipment-form";

export default async function FindEquipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tech.find");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 py-10 text-center">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted">{t("instructions")}</p>
      <div className="rounded-lg border border-border bg-card p-6">
        <FindEquipmentForm />
      </div>
      <p className="text-xs text-muted">{t("scanHint")}</p>
    </div>
  );
}
