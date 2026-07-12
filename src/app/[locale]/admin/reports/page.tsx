import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/format";
import { ResultBadge } from "@/components/result-badge";
import { ExportExcelButton, type ReportRow } from "@/components/export-excel-button";
import { TypeSubtypeFilter, type FilterType, type FilterSubtype } from "@/components/type-subtype-filter";
import { Link } from "@/i18n/navigation";

type EquipmentLookup = {
  id: string;
  code: string;
  facility_code: string | null;
  floor: string | null;
  zone: string | null;
  room_code: string | null;
  room_name: string | null;
  area: string | null;
  type_code: string | null;
  subtype_code: string | null;
  status: string | null;
};

type TechnicianOption = { id: string; full_name: string | null; arabic_name: string | null };

type MaintenanceLogRow = {
  id: string;
  equipment_id: string;
  work_order_number: string | null;
  maintenance_date: string | null;
  maintenance_time: string | null;
  technician_name: string | null;
  result: string | null;
  issues_found: number | null;
};

const STATUS_VALUES = ["compliant", "due", "overdue", "needs_attention", "decommissioned"] as const;
const NO_MATCH_SENTINEL = "__no_match__";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    workOrder?: string;
    facility?: string;
    type?: string;
    subtype?: string;
    area?: string;
    status?: string;
    technician?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { locale } = await params;
  const { q, workOrder, facility, type, subtype, area, status, technician, from, to } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.reports");
  const tStatus = await getTranslations("equipment.status_value");

  const supabase = await createClient();

  const [
    { data: equipmentRows },
    { data: types },
    { data: subtypes },
    { data: allSubtypesForLabels },
    { data: technicians },
  ] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, code, facility_code, floor, zone, room_code, room_name, area, type_code, subtype_code, status")
      .eq("deleted", false)
      .returns<EquipmentLookup[]>(),
    supabase
      .from("equipment_types")
      .select("id, code, name, arabic_name")
      .eq("active", true)
      .returns<FilterType[]>(),
    supabase
      .from("equipment_subtypes")
      .select("id, code, parent_type_id, name, arabic_name")
      .eq("active", true)
      .returns<FilterSubtype[]>(),
    // Unfiltered (includes inactive) so historical report rows still show a
    // proper label even if their subtype was later deactivated.
    supabase
      .from("equipment_subtypes")
      .select("code, name, arabic_name")
      .returns<{ code: string; name: string; arabic_name: string | null }[]>(),
    supabase
      .from("users")
      .select("id, full_name, arabic_name")
      .eq("role", "technician")
      .order("full_name", { ascending: true })
      .returns<TechnicianOption[]>(),
  ]);

  const equipmentMap = new Map((equipmentRows ?? []).map((e) => [e.id, e]));
  const subtypeLabels = new Map(
    (allSubtypesForLabels ?? []).map((s) => [s.code, (locale === "ar" ? s.arabic_name : s.name) || s.name])
  );
  const facilities = Array.from(
    new Set((equipmentRows ?? []).map((e) => e.facility_code).filter((f): f is string => Boolean(f)))
  ).sort();
  const areas = Array.from(
    new Set((equipmentRows ?? []).map((e) => e.area).filter((a): a is string => Boolean(a)))
  ).sort();

  let allowedEquipmentIds: string[] | null = null;
  if (q || facility || type || subtype || area || status) {
    let filtered = equipmentRows ?? [];
    if (q) filtered = filtered.filter((e) => e.code.toLowerCase().includes(q.toLowerCase()));
    if (facility) filtered = filtered.filter((e) => e.facility_code === facility);
    if (type) filtered = filtered.filter((e) => e.type_code === type);
    if (subtype) filtered = filtered.filter((e) => e.subtype_code === subtype);
    if (area) filtered = filtered.filter((e) => e.area === area);
    if (status) filtered = filtered.filter((e) => e.status === status);
    allowedEquipmentIds = filtered.map((e) => e.id);
  }

  let logQuery = supabase
    .from("maintenance_logs")
    .select("id, equipment_id, work_order_number, maintenance_date, maintenance_time, technician_name, result, issues_found")
    .eq("status", "completed")
    .eq("deleted", false);

  if (workOrder) logQuery = logQuery.ilike("work_order_number", `%${workOrder}%`);
  if (technician) logQuery = logQuery.eq("technician_id", technician);
  if (from) logQuery = logQuery.gte("maintenance_date", from);
  if (to) logQuery = logQuery.lte("maintenance_date", to);
  if (allowedEquipmentIds) {
    logQuery = logQuery.in(
      "equipment_id",
      allowedEquipmentIds.length > 0 ? allowedEquipmentIds : [NO_MATCH_SENTINEL]
    );
  }

  const { data: logs } = await logQuery
    .order("maintenance_date", { ascending: false, nullsFirst: false })
    .order("maintenance_time", { ascending: false, nullsFirst: false })
    .returns<MaintenanceLogRow[]>();

  const rows: ReportRow[] = (logs ?? []).map((log) => {
    const eq = equipmentMap.get(log.equipment_id);
    return {
      id: log.id,
      workOrderNumber: log.work_order_number,
      equipmentCode: eq?.code ?? "—",
      facility: eq?.facility_code ?? null,
      floor: eq?.floor ?? null,
      zone: eq?.zone ?? null,
      room: eq?.room_code ?? null,
      roomName: eq?.room_name ?? null,
      area: eq?.area ?? null,
      subtype: eq?.subtype_code ? subtypeLabels.get(eq.subtype_code) ?? eq.subtype_code : null,
      maintenanceDate: log.maintenance_date,
      maintenanceTime: log.maintenance_time,
      technicianName: log.technician_name,
      result: log.result,
      issuesFound: log.issues_found,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/reports/statement"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
          >
            {t("statement.linkLabel")}
          </Link>
          <Link
            href="/admin/reports/executed"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
          >
            {t("executed.linkLabel")}
          </Link>
          <Link
            href="/admin/reports/inspection-form"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
          >
            {t("inspectionForm.linkLabel")}
          </Link>
          <ExportExcelButton rows={rows} locale={locale} />
        </div>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      >
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.equipmentSearch")}</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("filters.equipmentSearchPlaceholder")}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.workOrder")}</label>
          <input
            type="text"
            name="workOrder"
            defaultValue={workOrder ?? ""}
            placeholder={t("filters.workOrderPlaceholder")}
            dir="ltr"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.facility")}</label>
          <select
            name="facility"
            defaultValue={facility ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allFacilities")}</option>
            {facilities.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <TypeSubtypeFilter
          types={types ?? []}
          subtypes={subtypes ?? []}
          locale={locale}
          defaultTypeCode={type}
          defaultSubtypeCode={subtype}
          typeLabel={t("filters.type")}
          subtypeLabel={t("filters.subtype")}
          allTypesLabel={t("filters.allTypes")}
          allSubtypesLabel={t("filters.allSubtypes")}
        />
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.area")}</label>
          <select
            name="area"
            defaultValue={area ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allAreas")}</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.status")}</label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allStatuses")}</option>
            {STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {tStatus(value)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.technician")}</label>
          <select
            name="technician"
            defaultValue={technician ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allTechnicians")}</option>
            {(technicians ?? []).map((tech) => (
              <option key={tech.id} value={tech.id}>
                {(locale === "ar" ? tech.arabic_name : tech.full_name) || tech.full_name || tech.arabic_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.fromDate")}</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.toDate")}</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-1.5 text-sm font-medium hover:bg-background"
        >
          {t("filters.apply")}
        </button>
        <Link
          href="/admin/reports"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-muted hover:bg-background"
        >
          {t("filters.reset")}
        </Link>
      </form>

      <p className="text-sm text-muted">{t("resultCount", { count: rows.length })}</p>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-border text-start text-muted">
              <th className="px-4 py-2 text-start font-medium">{t("table.workOrder")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.code")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.facility")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.floor")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.zone")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.room")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.roomName")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.area")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.subtype")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.date")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.time")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.technician")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.result")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.issues")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-mono">{row.workOrderNumber ?? "—"}</td>
                <td className="px-4 py-2 font-mono">{row.equipmentCode}</td>
                <td className="px-4 py-2">{row.facility ?? "—"}</td>
                <td className="px-4 py-2">{row.floor ?? "—"}</td>
                <td className="px-4 py-2">{row.zone ?? "—"}</td>
                <td className="px-4 py-2">{row.room ?? "—"}</td>
                <td className="px-4 py-2">{row.roomName ?? "—"}</td>
                <td className="px-4 py-2">{row.area ?? "—"}</td>
                <td className="px-4 py-2">{row.subtype ?? "—"}</td>
                <td className="px-4 py-2">{formatDate(row.maintenanceDate, locale)}</td>
                <td className="px-4 py-2">{formatTime(row.maintenanceTime, locale)}</td>
                <td className="px-4 py-2">{row.technicianName ?? "—"}</td>
                <td className="px-4 py-2">
                  {row.result ? <ResultBadge result={row.result} /> : "—"}
                </td>
                <td className="px-4 py-2">{row.issuesFound ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-muted">{t("empty")}</p>}
      </div>
    </div>
  );
}
