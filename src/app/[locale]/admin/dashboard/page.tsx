import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { formatNumber, formatMonthYear } from "@/lib/format";
import { SummaryCard } from "@/components/summary-card";
import { ComplianceChart } from "@/components/compliance-chart";
import { ComplianceTrendChart, type TrendDatum } from "@/components/compliance-trend-chart";
import { PeriodSelector } from "@/components/period-selector";
import { TypeSubtypeFilter, type FilterType, type FilterSubtype } from "@/components/type-subtype-filter";
import { riyadhMonthKey } from "@/lib/timezone";
import {
  aggregatePeriodStatuses,
  classifyPeriodStatus,
  complianceRate,
  currentPeriodKey,
  derivePeriod,
  equipmentExistedBy,
  getDuePeriods,
  listMonthKeys,
  summarizePeriodBuckets,
  type PeriodBucket,
} from "@/lib/period";

const BUCKET_VALUES: PeriodBucket[] = ["completed", "executed_not_verified", "needs_redo", "scheduled", "overdue"];
const NOTHING_HAPPENED_BUCKETS: PeriodBucket[] = ["scheduled", "needs_redo", "overdue"];
const NO_MATCH_SENTINEL = "__no_match__";

type EquipmentRow = {
  id: string;
  floor: string | null;
  area: string | null;
  created_at: string;
  maintenance_frequency: string | null;
  deleted: boolean;
};

type MaintenanceLogRow = {
  equipment_id: string;
  maintenance_date: string;
  approval_status: string;
};

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    facility?: string;
    type?: string;
    subtype?: string;
    floor?: string;
    area?: string;
    bucket?: string;
    period?: string;
  }>;
}) {
  const { locale } = await params;
  const { facility, type, subtype, floor, area, bucket, period: periodParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.dashboard");

  const supabase = await createClient();

  // Fired now, awaited later (near where its results are used) -- these
  // filter-option lookups don't depend on the equipment/logs query below, so
  // there's no reason to make them wait for it to finish first.
  const filterListsPromise = Promise.all([
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
    supabase.from("equipment").select("facility_code").eq("deleted", false).not("facility_code", "is", null),
    supabase.from("equipment").select("floor").eq("deleted", false).not("floor", "is", null),
    supabase.from("equipment").select("area").eq("deleted", false).not("area", "is", null),
  ]);

  // The period selector's range is based on the OLDEST equipment ever
  // created, deleted or not -- otherwise a month where only a since-deleted
  // unit existed would vanish from the selector, and history with no way to
  // view it isn't history.
  const { data: oldestRows } = await supabase
    .from("equipment")
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(1);

  const currentKey = currentPeriodKey();
  const oldestKey = oldestRows && oldestRows.length > 0 ? riyadhMonthKey(oldestRows[0].created_at) : currentKey;
  const availableKeys = listMonthKeys(oldestKey, currentKey);
  const selectedPeriodKey = periodParam && (periodParam === "all" || availableKeys.includes(periodParam))
    ? periodParam
    : currentKey;

  // Equipment scoped by the visible filters -- deliberately NOT filtered by
  // deleted=false. History isn't revised: a deleted unit still shows in
  // periods where it genuinely completed or executed-but-unverified. The
  // omission rule for "would show as scheduled/needs_redo/overdue" is
  // applied after classification, per period, below.
  let query = supabase
    .from("equipment")
    .select("id, floor, area, created_at, maintenance_frequency, deleted");

  if (facility) query = query.eq("facility_code", facility);
  if (type) query = query.eq("type_code", type);
  if (subtype) query = query.eq("subtype_code", subtype);
  if (floor) query = query.eq("floor", floor);
  if (area) query = query.eq("area", area);

  const { data: equipment } = await query.returns<EquipmentRow[]>();
  const equipmentRows = equipment ?? [];

  const [{ data: types }, { data: subtypes }, { data: facilityRows }, { data: floorRows }, { data: areaRows }] =
    await filterListsPromise;

  const facilities = Array.from(
    new Set((facilityRows ?? []).map((r) => r.facility_code as string))
  ).sort();
  const floors = Array.from(new Set((floorRows ?? []).map((r) => r.floor as string))).sort();
  const areas = Array.from(new Set((areaRows ?? []).map((r) => r.area as string))).sort();

  const periodOptions = availableKeys.map((key) => ({ key, label: formatMonthYear(`${key}-01`, locale) }));

  const backToFloorsParams = new URLSearchParams();
  if (facility) backToFloorsParams.set("facility", facility);
  if (type) backToFloorsParams.set("type", type);
  if (subtype) backToFloorsParams.set("subtype", subtype);
  if (area) backToFloorsParams.set("area", area);
  if (bucket) backToFloorsParams.set("bucket", bucket);
  if (selectedPeriodKey !== currentKey) backToFloorsParams.set("period", selectedPeriodKey);
  const backToFloorsQuery = backToFloorsParams.toString();

  const filterForm = (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
    >
      <input type="hidden" name="period" value={selectedPeriodKey} />
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
      {selectedPeriodKey !== "all" && (
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.status")}</label>
          <select
            name="bucket"
            defaultValue={bucket ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allStatuses")}</option>
            {BUCKET_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`chart.${value}`)}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="submit"
        className="rounded-md border border-border px-4 py-1.5 text-sm font-medium hover:bg-background"
      >
        {t("filters.apply")}
      </button>
      <Link
        href="/admin/dashboard"
        className="rounded-md px-4 py-1.5 text-sm font-medium text-muted hover:bg-background"
      >
        {t("filters.reset")}
      </Link>
    </form>
  );

  if (selectedPeriodKey === "all") {
    const equipmentIds = equipmentRows.map((e) => e.id);
    const { data: logs } = await supabase
      .from("maintenance_logs")
      .select("equipment_id, maintenance_date, approval_status")
      .eq("status", "completed")
      .eq("deleted", false)
      .in("equipment_id", equipmentIds.length > 0 ? equipmentIds : [NO_MATCH_SENTINEL])
      .returns<MaintenanceLogRow[]>();

    const logsByEquipment = new Map<string, MaintenanceLogRow[]>();
    for (const log of logs ?? []) {
      const list = logsByEquipment.get(log.equipment_id) ?? [];
      list.push(log);
      logsByEquipment.set(log.equipment_id, list);
    }

    const perPeriod = new Map<string, { completed: number; total: number }>();
    for (const key of availableKeys) perPeriod.set(key, { completed: 0, total: 0 });

    // Rate excludes deleted equipment entirely -- numerator and denominator.
    for (const row of equipmentRows) {
      if (row.deleted) continue;
      const periods = getDuePeriods(row, { fromKey: oldestKey, toKey: currentKey });
      for (const p of periods) {
        const b = classifyPeriodStatus(p, logsByEquipment.get(row.id) ?? []);
        const acc = perPeriod.get(p.key)!;
        acc.total += 1;
        if (b === "completed") acc.completed += 1;
      }
    }

    const trendData: TrendDatum[] = availableKeys.map((key) => {
      const acc = perPeriod.get(key)!;
      return {
        key,
        label: formatMonthYear(`${key}-01`, locale),
        completed: acc.completed,
        total: acc.total,
        rate: complianceRate(acc),
      };
    });

    const overall = trendData.reduce(
      (sum, d) => ({ completed: sum.completed + d.completed, total: sum.total + d.total }),
      { completed: 0, total: 0 }
    );
    const overallRatePct = Math.round(complianceRate(overall) * 100);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <PeriodSelector periods={periodOptions} selected={selectedPeriodKey} />
        </div>

        {filterForm}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <SummaryCard label={t("cards.total")} value={formatNumber(overall.total, locale)} />
          <SummaryCard
            label={t("cards.overallRate")}
            value={`${formatNumber(overallRatePct, locale)}%`}
            color="green"
          />
          <SummaryCard label={t("cards.completed")} value={formatNumber(overall.completed, locale)} color="green" />
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("chart.trendTitle")}</h2>
          {trendData.every((d) => d.total === 0) ? (
            <p className="text-muted">{t("chart.empty")}</p>
          ) : (
            <Suspense>
              <ComplianceTrendChart data={trendData} locale={locale} />
            </Suspense>
          )}
        </div>
      </div>
    );
  }

  const period = derivePeriod(selectedPeriodKey);
  const scopedEquipment = equipmentRows.filter((row) => equipmentExistedBy(row, period));
  const scopedIds = scopedEquipment.map((e) => e.id);

  const { data: logs } = await supabase
    .from("maintenance_logs")
    .select("equipment_id, maintenance_date, approval_status")
    .eq("status", "completed")
    .eq("deleted", false)
    .gte("maintenance_date", period.startDate)
    .lte("maintenance_date", period.endDate)
    .in("equipment_id", scopedIds.length > 0 ? scopedIds : [NO_MATCH_SENTINEL])
    .returns<MaintenanceLogRow[]>();

  const logsByEquipment = new Map<string, MaintenanceLogRow[]>();
  for (const log of logs ?? []) {
    const list = logsByEquipment.get(log.equipment_id) ?? [];
    list.push(log);
    logsByEquipment.set(log.equipment_id, list);
  }

  const classified = scopedEquipment.map((row) => ({
    ...row,
    bucket: classifyPeriodStatus(period, logsByEquipment.get(row.id) ?? []),
  }));

  const bucketFiltered = bucket ? classified.filter((r) => r.bucket === bucket) : classified;

  // "Appears normally" for deleted equipment applies only to real completed/
  // executed-not-verified history; the "nothing happened" buckets
  // (scheduled/needs_redo/overdue) omit deleted equipment entirely -- it's
  // never counted as overdue, and there's no meaningful "still scheduled"
  // for something no longer tracked.
  const displayRows = bucketFiltered.filter(
    (r) => !r.deleted || !NOTHING_HAPPENED_BUCKETS.includes(r.bucket)
  );
  const rateRows = bucketFiltered.filter((r) => !r.deleted);

  const summary = summarizePeriodBuckets(displayRows.map((r) => r.bucket));
  const rateSummary = summarizePeriodBuckets(rateRows.map((r) => r.bucket));
  const ratePct = Math.round(complianceRate({ completed: rateSummary.completed, total: rateSummary.total }) * 100);

  const chartData = aggregatePeriodStatuses(displayRows, floor ? "area" : "floor");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <PeriodSelector periods={periodOptions} selected={selectedPeriodKey} />
      </div>

      {filterForm}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <SummaryCard label={t("cards.total")} value={formatNumber(summary.total, locale)} />
        <SummaryCard label={t("cards.completed")} value={formatNumber(summary.completed, locale)} color="green" />
        <SummaryCard
          label={t("cards.executedNotVerified")}
          value={formatNumber(summary.executedNotVerified, locale)}
          color="blue"
        />
        <SummaryCard label={t("cards.needsRedo")} value={formatNumber(summary.needsRedo, locale)} color="orange" />
        <SummaryCard label={t("cards.scheduled")} value={formatNumber(summary.scheduled, locale)} color="amber" />
        <SummaryCard label={t("cards.overdue")} value={formatNumber(summary.overdue, locale)} color="red" />
        <SummaryCard label={t("cards.complianceRate")} value={`${formatNumber(ratePct, locale)}%`} color="green" />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {floor ? t("chart.byAreaIn", { floor }) : t("chart.title")}
          </h2>
          {floor && (
            <Link
              href={`/admin/dashboard${backToFloorsQuery ? `?${backToFloorsQuery}` : ""}`}
              className="text-sm text-primary underline"
            >
              {t("chart.backToFloors")}
            </Link>
          )}
        </div>
        {chartData.length === 0 ? (
          <p className="text-muted">{t("chart.empty")}</p>
        ) : (
          <Suspense>
            <ComplianceChart data={chartData} locale={locale} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
