import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EquipmentEditForm, type EditableEquipment } from "@/components/equipment-edit-form";

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.equipment.form");

  const supabase = await createClient();
  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, facility_code, floor, room_code, room_name, area, weight, maintenance_frequency, status")
    .eq("id", id)
    .eq("deleted", false)
    .single<EditableEquipment>();

  if (!equipment) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t("editTitle")}</h1>
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <EquipmentEditForm equipment={equipment} />
      </div>
    </div>
  );
}
