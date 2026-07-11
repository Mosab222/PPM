import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EquipmentEditForm, type EditableEquipment } from "@/components/equipment-edit-form";
import { BackButton } from "@/components/back-button";
import { classifyOperationalStatus } from "@/lib/operational-status";

type LatestCompletedLog = { result: string | null };

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
    .select(
      "id, code, facility_code, floor, zone, room_code, room_name, area, weight, maintenance_frequency, status, manual_operational_override"
    )
    .eq("id", id)
    .eq("deleted", false)
    .single<EditableEquipment>();

  if (!equipment) {
    notFound();
  }

  const { data: latestLog } = await supabase
    .from("maintenance_logs")
    .select("result")
    .eq("equipment_id", id)
    .eq("status", "completed")
    .eq("deleted", false)
    .order("maintenance_date", { ascending: false, nullsFirst: false })
    .order("maintenance_time", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<LatestCompletedLog>();

  const operationalStatus = classifyOperationalStatus({
    manualOverride: equipment.manual_operational_override,
    latestCompletedResult: latestLog?.result ?? null,
  });

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <h1 className="text-xl font-bold">{t("editTitle")}</h1>
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <EquipmentEditForm equipment={equipment} operationalStatus={operationalStatus} />
      </div>
    </div>
  );
}
