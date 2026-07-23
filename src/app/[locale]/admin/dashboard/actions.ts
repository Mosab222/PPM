"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  classifyPeriodStatus,
  derivePeriod,
  equipmentExistedBy,
  type PeriodBucket,
} from "@/lib/period";

type EquipmentRow = {
  id: string;
  code: string;
  subtype_code: string;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
  next_maintenance_date: string | null;
  created_at: string;
  deleted: boolean;
};

type MaintenanceLogRow = {
  equipment_id: string;
  maintenance_date: string;
  approval_status: string;
};

type EquipmentType = { id: string; name: string; arabic_name: string | null };
type EquipmentSubtype = { code: string; parent_type_id: string; name: string; arabic_name: string | null };

export type DrilldownEquipmentRow = {
  id: string;
  code: string;
  subtypeLabel: string;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
  next_maintenance_date: string | null;
  bucket: PeriodBucket;
};

export type FetchPeriodBucketResult = { rows: DrilldownEquipmentRow[] } | { error: string };

const NOTHING_HAPPENED_BUCKETS: PeriodBucket[] = ["scheduled", "needs_redo", "overdue"];

export async function fetchPeriodBucketEquipment(input: {
  facility?: string;
  type?: string;
  subtype?: string;
  floor?: string;
  area?: string;
  bucket: PeriodBucket;
  periodKey: string;
  locale: string;
}): Promise<FetchPeriodBucketResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "unauthorized" };
  }

  const supabase = await createClient();
  const period = derivePeriod(input.periodKey);

  // Deliberately NOT filtered by deleted=false -- deleted equipment still
  // appears here for periods where it genuinely completed or executed-but-
  // unverified ("history isn't revised"). The omission for "would show as
  // scheduled/needs_redo/overdue" happens after classification below.
  let query = supabase
    .from("equipment")
    .select("id, code, subtype_code, floor, zone, room_code, next_maintenance_date, created_at, deleted");

  if (input.facility) query = query.eq("facility_code", input.facility);
  if (input.type) query = query.eq("type_code", input.type);
  if (input.subtype) query = query.eq("subtype_code", input.subtype);
  if (input.floor) query = query.eq("floor", input.floor);
  if (input.area) query = query.eq("area", input.area);

  const { data: equipment, error } = await query.returns<EquipmentRow[]>();
  if (error) {
    return { error: "fetchError" };
  }

  const equipmentRows = (equipment ?? []).filter((row) => equipmentExistedBy(row, period));
  if (equipmentRows.length === 0) {
    return { rows: [] };
  }

  const equipmentIds = equipmentRows.map((e) => e.id);

  const [{ data: logs }, { data: types }, { data: subtypes }] = await Promise.all([
    supabase
      .from("maintenance_logs")
      .select("equipment_id, maintenance_date, approval_status")
      .eq("status", "completed")
      .eq("deleted", false)
      .gte("maintenance_date", period.startDate)
      .lte("maintenance_date", period.endDate)
      .in("equipment_id", equipmentIds)
      .returns<MaintenanceLogRow[]>(),
    supabase.from("equipment_types").select("id, name, arabic_name").eq("active", true).returns<EquipmentType[]>(),
    supabase
      .from("equipment_subtypes")
      .select("code, parent_type_id, name, arabic_name")
      .eq("active", true)
      .returns<EquipmentSubtype[]>(),
  ]);

  const logsByEquipment = new Map<string, MaintenanceLogRow[]>();
  for (const log of logs ?? []) {
    const list = logsByEquipment.get(log.equipment_id) ?? [];
    list.push(log);
    logsByEquipment.set(log.equipment_id, list);
  }

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
      row,
      bucket: classifyPeriodStatus(period, logsByEquipment.get(row.id) ?? []),
    }))
    .filter(({ bucket, row }) => {
      if (bucket !== input.bucket) return false;
      if (row.deleted && NOTHING_HAPPENED_BUCKETS.includes(bucket)) return false;
      return true;
    })
    .map(({ row, bucket }) => ({
      id: row.id,
      code: row.code,
      subtypeLabel: subtypeLabels.get(row.subtype_code) ?? row.subtype_code,
      floor: row.floor,
      zone: row.zone,
      room_code: row.room_code,
      next_maintenance_date: row.next_maintenance_date,
      bucket,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return { rows };
}
