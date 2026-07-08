import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { PrintButton } from "@/components/print-button";
import { SummaryCard } from "@/components/summary-card";
import { ResultBadge } from "@/components/result-badge";
import { TypeSubtypeFilter, type FilterType, type FilterSubtype } from "@/components/type-subtype-filter";
import { formatDate, formatNumber } from "@/lib/format";
import { riyadhDateString } from "@/lib/timezone";

type EquipmentLookup = {
  id: string;
  type_code: string | null;
  subtype_code: string | null;
  floor: string | null;
  area: string | null;
  room_name: string | null;
};

type MaintenanceLogRow = {
  id: string;
  equipment_id: string;
  work_order_number: string | null;
  maintenance_date: string | null;
  maintenance_time: string | null;
  technician_name: string | null;
  result: string | null;
};

const NO_MATCH_SENTINEL = "__no_match__";

export default async function ExecutedMaintenanceReportPage({
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
  const t = await getTranslations("admin.reports.executed");
  const tResult = await getTranslations("equipment.result");

  const supabase = await createClient();

  let equipmentQuery = supabase
    .from("equipment")
    .select("id, type_code, subtype_code, floor, area, room_name")
    .eq("deleted", false);

  if (type) equipmentQuery = equipmentQuery.eq("type_code", type);
  if (subtype) equipmentQuery = equipmentQuery.eq("subtype_code", subtype);
  if (floor) equipmentQuery = equipmentQuery.eq("floor", floor);
  if (area) equipmentQuery = equipmentQuery.eq("area", area);

  const { data: equipment } = await equipmentQuery.returns<EquipmentLookup[]>();
  const equipmentRows = equipment ?? [];
  const equipmentMap = new Map(equipmentRows.map((e) => [e.id, e]));
  const equipmentIds = equipmentRows.map((e) => e.id);

  let logQuery = supabase
    .from("maintenance_logs")
    .select("id, equipment_id, work_order_number, maintenance_date, maintenance_time, technician_name, result")
    .eq("status", "completed")
    .eq("deleted", false)
    .in("equipment_id", equipmentIds.length > 0 ? equipmentIds : [NO_MATCH_SENTINEL]);

  if (from) logQuery = logQuery.gte("maintenance_date", from);
  if (to) logQuery = logQuery.lte("maintenance_date", to);

  const { data: logs } = await logQuery
    .order("maintenance_date", { ascending: false, nullsFirst: false })
    .order("maintenance_time", { ascending: false, nullsFirst: false })
    .returns<MaintenanceLogRow[]>();

  const rows = (logs ?? []).map((log) => ({
    ...log,
    roomName: equipmentMap.get(log.equipment_id)?.room_name ?? null,
  }));

  const passedCount = rows.filter((r) => r.result === "passed").length;
  const needsAttentionCount = rows.filter((r) => r.result === "needs_attention").length;

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
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <PrintButton label={t("printButton")} />
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 print:hidden"
      >
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
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-1.5 text-sm font-medium hover:bg-background"
        >
          {t("filters.apply")}
        </button>
        <Link
          href="/admin/reports/executed"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-muted hover:bg-background"
        >
          {t("filters.reset")}
        </Link>
      </form>

      <p className="text-sm text-muted print:hidden">
        {t("resultCount", { count: formatNumber(rows.length, locale) })}
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SummaryCard label={t("summary.total")} value={formatNumber(rows.length, locale)} />
          <SummaryCard label={tResult("passed")} value={formatNumber(passedCount, locale)} color="green" />
          <SummaryCard label={tResult("needs_attention")} value={formatNumber(needsAttentionCount, locale)} color="amber" />
        </div>

        {rows.length === 0 ? (
          <p className="p-6 text-center text-muted">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="pms-table w-full text-start text-sm">
              <thead>
                <tr className="border-b-2 border-primary bg-primary/10 text-start">
                  <th className="px-3 py-2 text-start font-medium">{t("table.seq")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.workOrder")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.code")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.roomName")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.date")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.technician")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.result")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-0 ${index % 2 === 1 ? "bg-background/60" : ""}`}
                  >
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-mono">{row.work_order_number ?? "—"}</td>
                    <td className="px-3 py-2 font-mono">{row.equipment_id}</td>
                    <td className="px-3 py-2">{row.roomName ?? "—"}</td>
                    <td className="px-3 py-2">{formatDate(row.maintenance_date, locale)}</td>
                    <td className="px-3 py-2">{row.technician_name ?? "—"}</td>
                    <td className="px-3 py-2">{row.result ? <ResultBadge result={row.result} /> : "—"}</td>
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
