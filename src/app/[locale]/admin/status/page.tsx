import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { SummaryCard } from "@/components/summary-card";
import { OperationalChart } from "@/components/operational-chart";
import { OperationalDonutGrid, type TypeDonutDatum } from "@/components/operational-donut-grid";
import { TypeSubtypeFilter, type FilterType, type FilterSubtype } from "@/components/type-subtype-filter";
import {
  aggregateOperational,
  classifyOperationalStatus,
  summarizeOperational,
  type OperationalStatus,
} from "@/lib/operational-status";

const NO_MATCH_SENTINEL = "__no_match__";

type EquipmentRow = {
  id: string;
  facility_code: string | null;
  floor: string | null;
  type_code: string | null;
  manual_operational_override: string | null;
};

type MaintenanceLogRow = {
  equipment_id: string;
  result: string | null;
  maintenance_date: string;
  maintenance_time: string | null;
};

type TypeLabelRow = { code: string; name: string; arabic_name: string | null };

export default async function OperationalStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    facility?: string;
    type?: string;
    subtype?: string;
    area?: string;
  }>;
}) {
  const { locale } = await params;
  const { facility, type, subtype, area } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.operationalDashboard");

  const supabase = await createClient();

  let query = supabase
    .from("equipment")
    .select("id, facility_code, floor, type_code, manual_operational_override")
    .eq("deleted", false);

  if (facility) query = query.eq("facility_code", facility);
  if (type) query = query.eq("type_code", type);
  if (subtype) query = query.eq("subtype_code", subtype);
  if (area) query = query.eq("area", area);

  const { data: equipment } = await query.returns<EquipmentRow[]>();
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

  // Logs are ordered newest-first, so the first time we see an equipment_id
  // here is that equipment's latest completed result.
  const latestResultByEquipment = new Map<string, string | null>();
  for (const log of logs ?? []) {
    if (!latestResultByEquipment.has(log.equipment_id)) {
      latestResultByEquipment.set(log.equipment_id, log.result);
    }
  }

  const classified = equipmentRows.map((row) => ({
    ...row,
    bucket: classifyOperationalStatus({
      manualOverride: row.manual_operational_override,
      latestCompletedResult: latestResultByEquipment.get(row.id) ?? null,
    }),
  }));

  const [{ data: types }, { data: subtypes }, { data: allTypesForLabels }, { data: facilityRows }, { data: areaRows }] =
    await Promise.all([
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
      // Unfiltered so a donut (or the bar chart) can still label equipment
      // referencing a type that's since been deactivated.
      supabase.from("equipment_types").select("code, name, arabic_name").returns<TypeLabelRow[]>(),
      supabase.from("equipment").select("facility_code").eq("deleted", false).not("facility_code", "is", null),
      supabase.from("equipment").select("area").eq("deleted", false).not("area", "is", null),
    ]);

  const facilities = Array.from(new Set((facilityRows ?? []).map((r) => r.facility_code as string))).sort();
  const areas = Array.from(new Set((areaRows ?? []).map((r) => r.area as string))).sort();

  const typeLabelByCode = new Map(
    (allTypesForLabels ?? []).map((t) => [t.code, (locale === "ar" ? t.arabic_name : t.name) || t.name])
  );

  const summary = summarizeOperational(classified.map((r) => r.bucket as OperationalStatus));
  const chartData = aggregateOperational(
    classified.map((row) => ({
      bucket: row.bucket,
      floor: row.floor,
      typeCode: row.type_code,
      typeLabel: row.type_code ? typeLabelByCode.get(row.type_code) ?? row.type_code : null,
    })),
    type ? "floor" : "type"
  );

  // Dynamically derive one donut per type CODE actually present among the
  // filtered equipment -- so a brand-new type gets a donut the moment an
  // equipment row references it, with zero code changes.
  const donutTotals = new Map<string, { healthy: number; needsAttention: number; outOfService: number }>();
  for (const row of classified) {
    const code = row.type_code ?? "—";
    if (!donutTotals.has(code)) {
      donutTotals.set(code, { healthy: 0, needsAttention: 0, outOfService: 0 });
    }
    const bucketTotals = donutTotals.get(code)!;
    if (row.bucket === "healthy") bucketTotals.healthy++;
    else if (row.bucket === "needs_attention") bucketTotals.needsAttention++;
    else bucketTotals.outOfService++;
  }

  const donuts: TypeDonutDatum[] = Array.from(donutTotals.entries())
    .map(([typeCode, totals]) => ({
      typeCode,
      typeLabel: typeLabelByCode.get(typeCode) ?? typeCode,
      ...totals,
    }))
    .sort((a, b) => a.typeLabel.localeCompare(b.typeLabel));

  // Subtype is nested under type, so clearing type on the way back up also
  // clears subtype (mirrors how selecting a new type resets subtype).
  const backToTypesParams = new URLSearchParams();
  if (facility) backToTypesParams.set("facility", facility);
  if (area) backToTypesParams.set("area", area);
  const backToTypesQuery = backToTypesParams.toString();

  const typeLabel = type ? typeLabelByCode.get(type) ?? type : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      >
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
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-1.5 text-sm font-medium hover:bg-background"
        >
          {t("filters.apply")}
        </button>
        <Link
          href="/admin/status"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-muted hover:bg-background"
        >
          {t("filters.reset")}
        </Link>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label={t("cards.total")} value={formatNumber(summary.total, locale)} />
        <SummaryCard label={t("cards.healthy")} value={formatNumber(summary.healthy, locale)} color="green" />
        <SummaryCard
          label={t("cards.needsAttention")}
          value={formatNumber(summary.needsAttention, locale)}
          color="amber"
        />
        <SummaryCard
          label={t("cards.outOfService")}
          value={formatNumber(summary.outOfService, locale)}
          color="red"
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {type ? t("chart.byFloorInType", { type: typeLabel ?? type }) : t("chart.title")}
          </h2>
          {type && (
            <Link
              href={`/admin/status${backToTypesQuery ? `?${backToTypesQuery}` : ""}`}
              className="text-sm text-primary underline"
            >
              {t("chart.backToTypes")}
            </Link>
          )}
        </div>
        {chartData.length === 0 ? (
          <p className="text-muted">{t("chart.empty")}</p>
        ) : (
          <Suspense>
            <OperationalChart data={chartData} locale={locale} drillable={!type} />
          </Suspense>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("donuts.sectionTitle")}</h2>
        <OperationalDonutGrid donuts={donuts} locale={locale} />
      </div>
    </div>
  );
}
