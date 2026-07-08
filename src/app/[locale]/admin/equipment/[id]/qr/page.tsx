import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EquipmentQrClient } from "@/components/equipment-qr-client";
import { BackButton } from "@/components/back-button";
import { Link } from "@/i18n/navigation";

export default async function EquipmentQrPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.equipment.qrPage");

  const supabase = await createClient();
  const { data: equipment } = await supabase
    .from("equipment")
    .select("id")
    .eq("id", id)
    .eq("deleted", false)
    .single<{ id: string }>();

  if (!equipment) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-6">
      <div className="self-start">
        <BackButton />
      </div>
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <EquipmentQrClient code={equipment.id} />
      <Link href="/admin/equipment" className="text-sm text-primary underline print:hidden">
        {t("back")}
      </Link>
    </div>
  );
}
