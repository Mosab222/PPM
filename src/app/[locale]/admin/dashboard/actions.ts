"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { classifySchedulingStatus, monthKey, previousMonthKey, type SchedulingBucket } from "@/lib/scheduling";

type EquipmentRow = {
  id: string;
  code: string;
  subtype_code: string;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
  next_maintenance_date: string | null;
  created_at: string;
  maintenance_frequency: string | null;
};

type MaintenanceLogRow = {
  equipment_id: string;
  maintenance_date: string;
  approval_status: string;
};

type PendingLogRow = {
  equipment_id: string;
};

type EquipmentType = {
  id: string;
  name: string;
  arabic_name: string | null;
};

type EquipmentSubtype = {
  code: string;
  parent_type_id: string;
  name: string;
  arabic_name: string | null;
};

export type DrilldownEquipmentRow = {
  id: string;
  code: string;
  subtypeLabel: string;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
  next_maintenance_date: string | null;
  bucket: SchedulingBucket;
};

export type FetchSchedulingBucketResult = { rows: DrilldownEquipmentRow[] } | { error: string };

export async function fetchSchedulingBucketEquipment(input: {
  facility?: string;
  type?: string;
  subtype?: string;
  floor?: string;
  area?: string;
  bucket: SchedulingBucket;
  locale: string;
}): Promise<FetchSchedulingBucketResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "unauthorized" };
  }

  const supabase = await createClient();

  let query = supabase
    .from("equipment")
    .select("id, code, subtype_code, floor, zone, room_code, next_maintenance_date, created_at, maintenance_frequency")
    .eq("deleted", false);

  if (input.facility) query = query.eq("facility_code", input.facility);
  if (input.type) query = query.eq("type_code", input.type);
  if (input.subtype) query = query.eq("subtype_code", input.subtype);
  if (input.floor) query = query.eq("floor", input.floor);
  if (input.area) query = query.eq("area", input.area);

  const { data: equipment, error } = await query.returns<EquipmentRow[]>();
  if (error) {
    return { error: "fetchError" };
  }

  const equipmentRows = equipment ?? [];
  if (equipmentRows.length === 0) {
    return { rows: [] };
  }

  const equipmentIds = equipmentRows.map((e) => e.id);
  const todayIso = new Date().toISOString();
  const currentMonth = monthKey(todayIso);
  const previousMonth = previousMonthKey(currentMonth);
  const previousMonthStartIso = `${previousMonth}-01`;

  const [{ data: logs }, { data: pendingLogs }, { data: types }, { data: subtypes }] = await Promise.all([
    supabase
      .from("maintenance_logs")
      .select("equipment_id, maintenance_date, approval_status")
      .eq("status", "completed")
      .eq("deleted", false)
      .gte("maintenance_date", previousMonthStartIso)
      .in("equipment_id", equipmentIds)
      .returns<MaintenanceLogRow[]>(),
    supabase
      .from("maintenance_logs")
      .select("equipment_id")
      .in("approval_status", ["pending_head", "pending_manager"])
      .eq("deleted", false)
      .in("equipment_id", equipmentIds)
      .returns<PendingLogRow[]>(),
    supabase.from("equipment_types").select("id, name, arabic_name").eq("active", true).returns<EquipmentType[]>(),
    supabase
      .from("equipment_subtypes")
      .select("code, parent_type_id, name, arabic_name")
      .eq("active", true)
      .returns<EquipmentSubtype[]>(),
  ]);

  const currentMonthApproved = new Set<string>();
  const previousMonthApproved = new Set<string>();
  for (const log of logs ?? []) {
    if (log.approval_status !== "approved") continue;
    const logMonth = monthKey(log.maintenance_date);
    if (logMonth === currentMonth) currentMonthApproved.add(log.equipment_id);
    else if (logMonth === previousMonth) previousMonthApproved.add(log.equipment_id);
  }
  const pendingApproval = new Set((pendingLogs ?? []).map((l) => l.equipment_id));

  const typesById = new Map((types ?? []).map((t) => [t.id, t]));
  const subtypeLabels = new Map(
    (subtypes ?? []).map((s) => {
      const parentType = typesById.get(s.parent_type_id);
      const subtypeName = (input.locale === "ar" ? s.arabic_name : s.name) || s.name;
      const typeName = parentType ? (input.locale === "ar" ? parentType.arabic_name : parentType.name) || parentType.name : "";
      return [s.code, typeName ? `${typeName} — ${subtypeName}` : subtypeName];
    })
  );

  const rows: DrilldownEquipmentRow[] = equipmentRows
    .map((row) => ({
      id: row.id,
      code: row.code,
      subtypeLabel: subtypeLabels.get(row.subtype_code) ?? row.subtype_code,
      floor: row.floor,
      zone: row.zone,
      room_code: row.room_code,
      next_maintenance_date: row.next_maintenance_date,
      bucket: classifySchedulingStatus({
        frequency: row.maintenance_frequency,
        createdAt: row.created_at,
        hasCurrentMonthApproval: currentMonthApproved.has(row.id),
        hasPreviousMonthApproval: previousMonthApproved.has(row.id),
        hasPendingApproval: pendingApproval.has(row.id),
        todayIso,
      }),
    }))
    .filter((row) => row.bucket === input.bucket)
    .sort((a, b) => a.code.localeCompare(b.code));

  return { rows };
}
