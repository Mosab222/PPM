import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Link } from "@/i18n/navigation";
import { BackButton } from "@/components/back-button";
import { ApprovalQueueTable, type QueueRow } from "@/components/approval-queue-table";

type EquipmentLookup = {
  id: string;
  code: string;
  type_code: string | null;
  subtype_code: string | null;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
};

type LogRow = {
  id: string;
  equipment_id: string;
  technician_name: string | null;
  maintenance_date: string | null;
  maintenance_time: string | null;
  result: string | null;
  issues_found: number;
};

type EquipmentSubtype = { code: string; name: string; arabic_name: string | null; parent_type_id: string };
type EquipmentType = { id: string; code: string; name: string; arabic_name: string | null };

async function fetchQueue(
  queueStatus: "pending_head" | "pending_manager",
  locale: string
): Promise<QueueRow[]> {
  const supabase = await createClient();

  const [{ data: logs }, { data: types }, { data: subtypes }] = await Promise.all([
    supabase
      .from("maintenance_logs")
      .select("id, equipment_id, technician_name, maintenance_date, maintenance_time, result, issues_found")
      .eq("approval_status", queueStatus)
      .eq("status", "completed")
      .eq("deleted", false)
      .order("maintenance_date", { ascending: true, nullsFirst: false })
      .order("maintenance_time", { ascending: true, nullsFirst: false })
      .returns<LogRow[]>(),
    supabase.from("equipment_types").select("id, code, name, arabic_name").returns<EquipmentType[]>(),
    supabase
      .from("equipment_subtypes")
      .select("code, name, arabic_name, parent_type_id")
      .returns<EquipmentSubtype[]>(),
  ]);

  const logRows = logs ?? [];
  const equipmentIds = Array.from(new Set(logRows.map((l) => l.equipment_id)));

  const { data: equipmentRows } =
    equipmentIds.length > 0
      ? await supabase
          .from("equipment")
          .select("id, code, type_code, subtype_code, floor, zone, room_code")
          .in("id", equipmentIds)
          .returns<EquipmentLookup[]>()
      : { data: [] as EquipmentLookup[] };

  const equipmentMap = new Map((equipmentRows ?? []).map((e) => [e.id, e]));

  const typesById = new Map((types ?? []).map((tp) => [tp.id, tp]));
  const subtypeLabels = new Map(
    (subtypes ?? []).map((s) => {
      const parentType = typesById.get(s.parent_type_id);
      const subtypeName = (locale === "ar" ? s.arabic_name : s.name) || s.name;
      const typeName = parentType ? (locale === "ar" ? parentType.arabic_name : parentType.name) || parentType.name : "";
      return [s.code, typeName ? `${typeName} — ${subtypeName}` : subtypeName];
    })
  );

  return logRows
    .map((log): QueueRow | null => {
      const equipment = equipmentMap.get(log.equipment_id);
      if (!equipment) return null;
      return {
        id: log.id,
        equipmentCode: equipment.code,
        typeSubtypeLabel: subtypeLabels.get(equipment.subtype_code ?? "") ?? equipment.subtype_code ?? "—",
        floor: equipment.floor,
        zone: equipment.zone,
        roomCode: equipment.room_code,
        technicianName: log.technician_name,
        maintenanceDate: log.maintenance_date,
        result: log.result,
        issuesFound: log.issues_found,
      };
    })
    .filter((r): r is QueueRow => r !== null);
}

export default async function ApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("approvals");

  const user = await getCurrentUser();
  if (!user || user.role === "technician") {
    redirect(`/${locale}/login`);
  }

  if (user.role === "admin") {
    const activeTab = tab === "manager" ? "manager" : "head";
    const rows = await fetchQueue(activeTab === "head" ? "pending_head" : "pending_manager", locale);

    return (
      <div className="flex flex-col gap-4">
        <BackButton />
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <div className="flex gap-2 border-b border-border">
          <Link
            href="/approvals?tab=head"
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "head" ? "border-b-2 border-primary text-primary" : "text-muted"
            }`}
          >
            {t("tabs.head")}
          </Link>
          <Link
            href="/approvals?tab=manager"
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === "manager" ? "border-b-2 border-primary text-primary" : "text-muted"
            }`}
          >
            {t("tabs.manager")}
          </Link>
        </div>
        <ApprovalQueueTable rows={rows} canAct={false} locale={locale} />
      </div>
    );
  }

  const queueStatus = user.role === "head" ? "pending_head" : "pending_manager";
  const rows = await fetchQueue(queueStatus, locale);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t(user.role === "head" ? "titleHead" : "titleManager")}</h1>
      <ApprovalQueueTable rows={rows} canAct={true} locale={locale} />
    </div>
  );
}
