import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { BackButton } from "@/components/back-button";
import { PrintButton } from "@/components/print-button";
import { SummaryCard } from "@/components/summary-card";
import { OperationalStatusBadge } from "@/components/operational-status-badge";
import { TypeSubtypeFilter, type FilterType, type FilterSubtype } from "@/components/type-subtype-filter";
import { formatDate, formatNumber } from "@/lib/format";
import { riyadhDateString } from "@/lib/timezone";
import {
  classifyOperationalStatus,
  summarizeOperational,
  type OperationalStatus,
} from "@/lib/operational-status";

type EquipmentRow = {
  id: string;
  type_code: string | null;
  subtype_code: string | null;
  floor: string | null;
  room_code: string | null;
  room_name: string | null;
  area: string | null;
  maintenance_frequency: string | null;
  manual_operational_override: string | null;
};

type MaintenanceLogRow = {
  equipment_id: string;
  result: string | null;
  maintenance_date: string | null;
  maintenance_time: string | null;
};

const NO_MATCH_SENTINEL = "__no_match__";

export default async function PmStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    type?: string;
    subtype?: string;
    floor?: string;
    area?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { locale } = await params;
  const { type, subtype, floor, area, from, to } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.reports.statement");
  const tFreq = await getTranslations("admin.equipment.form");
  const tOpStatus = await getTranslations("equipment.operational_status_value");

  const supabase = await createClient();

  let query = supabase
    .from("equipment")
    .select(
      "id, type_code, subtype_code, floor, room_code, room_name, area, maintenance_frequency, manual_operational_override"
    )
    .eq("deleted", false);

  if (type) query = query.eq("type_code", type);
  if (subtype) query = query.eq("subtype_code", subtype);
  if (floor) query = query.eq("floor", floor);
  if (area) query = query.eq("area", area);

  const { data: equipment } = await query.order("id", { ascending: true }).returns<EquipmentRow[]>();
  const equipmentRows = equipment ?? [];
  const equipmentIds = equipmentRows.map((e) => e.id);

  const { data: logs } = await supabase
    .from("maintenance_logs")
    .select("equipment_id, result, maintenance_date, maintenance_time")
    .eq("status", "completed")
    .eq("deleted", false)
    .in("equipment_id", equipmentIds.length > 0 ? equipmentIds : [NO_MATCH_SENTINEL])
    .order("maintenance_date", { ascending: false, nullsFirst: false })
    .order("maintenance_time", { ascending: false, nullsFirst: false })
    .returns<MaintenanceLogRow[]>();

  // Logs are ordered newest-first. The operational status always reflects the
  // true latest completed result (unbounded by the date filter — it's a
  // real-time equipment attribute), while the "Last Maintenance" column shows
  // the latest completion that also falls inside the selected [from, to]
  // range, per the report's own period.
  const latestResultByEquipment = new Map<string, string | null>();
  const latestDateInRangeByEquipment = new Map<string, string>();
  for (const log of logs ?? []) {
    if (!latestResultByEquipment.has(log.equipment_id)) {
      latestResultByEquipment.set(log.equipment_id, log.result);
    }
    if (!log.maintenance_date) continue;
    const inRange = (!from || log.maintenance_date >= from) && (!to || log.maintenance_date <= to);
    if (inRange && !latestDateInRangeByEquipment.has(log.equipment_id)) {
      latestDateInRangeByEquipment.set(log.equipment_id, log.maintenance_date);
    }
  }

  const classified = equipmentRows.map((row) => ({
    ...row,
    bucket: classifyOperationalStatus({
      manualOverride: row.manual_operational_override,
      latestCompletedResult: latestResultByEquipment.get(row.id) ?? null,
    }) as OperationalStatus,
    lastMaintenanceDate: latestDateInRangeByEquipment.get(row.id) ?? null,
  }));

  const summary = summarizeOperational(classified.map((r) => r.bucket));

  const [{ data: types }, { data: subtypes }, { data: floorRows }, { data: areaRows }] = await Promise.all([
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
    supabase.from("equipment").select("floor").eq("deleted", false).not("floor", "is", null),
    supabase.from("equipment").select("area").eq("deleted", false).not("area", "is", null),
  ]);

  const floors = Array.from(new Set((floorRows ?? []).map((r) => r.floor as string))).sort();
  const areas = Array.from(new Set((areaRows ?? []).map((r) => r.area as string))).sort();

  const generatedOn = formatDate(riyadhDateString(), locale);

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <PrintButton label={t("printButton")} />
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 print:hidden"
      >
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
          <label className="mb-1 block text-xs text-muted">{t("filters.floor")}</label>
          <select
            name="floor"
            defaultValue={floor ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allFloors")}</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
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
          href="/admin/reports/statement"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-muted hover:bg-background"
        >
          {t("filters.reset")}
        </Link>
      </form>

      <p className="text-sm text-muted print:hidden">
        {t("resultCount", { count: formatNumber(classified.length, locale) })}
      </p>

      <div
        id="pms-print-area"
        className="pms-print-area flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
      >
        <div dir="ltr" className="grid grid-cols-3 items-center gap-4 border-b-4 border-primary pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zahran.png" alt="Zahran" className="h-14 w-auto justify-self-start object-contain" />
          <div className="text-center">
            <h2 className="text-lg font-bold text-primary">{t("title")}</h2>
            <p className="mt-1 text-sm font-medium">{t("facilityName")}</p>
            <p className="mt-0.5 text-xs text-muted">{t("generatedOn", { date: generatedOn })}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kaauh.png" alt="KAAUH" className="h-14 w-auto justify-self-end object-contain" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label={t("summary.total")} value={formatNumber(classified.length, locale)} />
          <SummaryCard label={tOpStatus("healthy")} value={formatNumber(summary.healthy, locale)} color="green" />
          <SummaryCard
            label={tOpStatus("needs_attention")}
            value={formatNumber(summary.needsAttention, locale)}
            color="amber"
          />
          <SummaryCard
            label={tOpStatus("out_of_service")}
            value={formatNumber(summary.outOfService, locale)}
            color="red"
          />
        </div>

        {classified.length === 0 ? (
          <p className="p-6 text-center text-muted">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="pms-table w-full text-start text-sm">
              <thead>
                <tr className="border-b-2 border-primary bg-primary/10 text-start">
                  <th className="px-3 py-2 text-start font-medium">{t("table.seq")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.code")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.floor")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.room")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.roomName")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.frequency")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.lastMaintenance")}</th>
                </tr>
              </thead>
              <tbody>
                {classified.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-0 ${index % 2 === 1 ? "bg-background/60" : ""}`}
                  >
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-mono">{row.id}</td>
                    <td className="px-3 py-2">
                      <OperationalStatusBadge status={row.bucket} />
                    </td>
                    <td className="px-3 py-2">{row.floor ?? "—"}</td>
                    <td className="px-3 py-2">{row.room_code ?? "—"}</td>
                    <td className="px-3 py-2">{row.room_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.maintenance_frequency ? tFreq(`frequency_value.${row.maintenance_frequency}`) : "—"}
                    </td>
                    <td className="px-3 py-2">{formatDate(row.lastMaintenanceDate, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
