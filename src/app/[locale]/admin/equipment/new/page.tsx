import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EquipmentForm, type EquipmentType, type EquipmentSubtype } from "@/components/equipment-form";

export default async function NewEquipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.equipment.form");

  const supabase = await createClient();

  const [{ data: types }, { data: subtypes }] = await Promise.all([
    supabase
      .from("equipment_types")
      .select("id, code, name, arabic_name")
      .eq("active", true)
      .returns<EquipmentType[]>(),
    supabase
      .from("equipment_subtypes")
      .select("id, code, parent_type_id, name, arabic_name, default_weight")
      .eq("active", true)
      .returns<EquipmentSubtype[]>(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <div className="rounded-lg border border-border bg-card p-6">
        <EquipmentForm types={types ?? []} subtypes={subtypes ?? []} locale={locale} />
      </div>
    </div>
  );
}
