import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { SummaryCard } from "@/components/summary-card";
import { ComplianceChart } from "@/components/compliance-chart";
import { TypeSubtypeFilter, type FilterType, type FilterSubtype } from "@/components/type-subtype-filter";
import {
  aggregateScheduling,
  classifySchedulingStatus,
  monthKey,
  previousMonthKey,
  summarizeScheduling,
  type SchedulingBucket,
} from "@/lib/scheduling";

const SCHEDULE_VALUES = ["done", "scheduled", "pending_approval", "overdue"] as const;
const NO_MATCH_SENTINEL = "__no_match__";

type EquipmentRow = {
  id: string;
  floor: string | null;
  area: string | null;
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
    schedule?: string;
  }>;
}) {
  const { locale } = await params;
  const { facility, type, subtype, floor, area, schedule } = await searchParams;
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

  let query = supabase
    .from("equipment")
    .select("id, floor, area, created_at, maintenance_frequency")
    .eq("deleted", false);

  if (facility) query = query.eq("facility_code", facility);
  if (type) query = query.eq("type_code", type);
  if (subtype) query = query.eq("subtype_code", subtype);
  if (floor) query = query.eq("floor", floor);
  if (area) query = query.eq("area", area);

  const { data: equipment } = await query.returns<EquipmentRow[]>();
  const equipmentRows = equipment ?? [];

  const todayIso = new Date().toISOString();
  const currentMonth = monthKey(todayIso);
  const previousMonth = previousMonthKey(currentMonth);
  const previousMonthStartIso = `${previousMonth}-01`;

  const equipmentIds = equipmentRows.map((e) => e.id);
  const { data: logs } = await supabase
    .from("maintenance_logs")
    .select("equipment_id, maintenance_date, approval_status")
    .eq("status", "completed")
    .eq("deleted", false)
    .gte("maintenance_date", previousMonthStartIso)
    .in("equipment_id", equipmentIds.length > 0 ? equipmentIds : [NO_MATCH_SENTINEL])
    .returns<MaintenanceLogRow[]>();

  // Pending approval has no time bound (a log can sit unresolved for weeks),
  // unlike current/previous month completion above -- so it's queried
  // separately, unbounded by date, rather than widening the query above.
  const { data: pendingLogs } = await supabase
    .from("maintenance_logs")
    .select("equipment_id")
    .in("approval_status", ["pending_head", "pending_manager"])
    .eq("deleted", false)
    .in("equipment_id", equipmentIds.length > 0 ? equipmentIds : [NO_MATCH_SENTINEL])
    .returns<PendingLogRow[]>();

  const currentMonthApproved = new Set<string>();
  const previousMonthApproved = new Set<string>();
  for (const log of logs ?? []) {
    if (log.approval_status !== "approved") continue; // rejected -- doesn't count
    const logMonth = monthKey(log.maintenance_date);
    if (logMonth === currentMonth) currentMonthApproved.add(log.equipment_id);
    else if (logMonth === previousMonth) previousMonthApproved.add(log.equipment_id);
  }
  const pendingApproval = new Set((pendingLogs ?? []).map((l) => l.equipment_id));

  const classified = equipmentRows.map((row) => ({
    ...row,
    bucket: classifySchedulingStatus({
      frequency: row.maintenance_frequency,
      createdAt: row.created_at,
      hasCurrentMonthApproval: currentMonthApproved.has(row.id),
      hasPreviousMonthApproval: previousMonthApproved.has(row.id),
      hasPendingApproval: pendingApproval.has(row.id),
      todayIso,
    }),
  }));

  const rows = schedule ? classified.filter((r) => r.bucket === schedule) : classified;

  const summary = summarizeScheduling(rows.map((r) => r.bucket as SchedulingBucket));
  const chartData = aggregateScheduling(rows, floor ? "area" : "floor");

  const [{ data: types }, { data: subtypes }, { data: facilityRows }, { data: floorRows }, { data: areaRows }] =
    await filterListsPromise;

  const facilities = Array.from(
    new Set((facilityRows ?? []).map((r) => r.facility_code as string))
  ).sort();
  const floors = Array.from(new Set((floorRows ?? []).map((r) => r.floor as string))).sort();
  const areas = Array.from(
    new Set((areaRows ?? []).map((r) => r.area as string))
  ).sort();

  const backToFloorsParams = new URLSearchParams();
  if (facility) backToFloorsParams.set("facility", facility);
  if (type) backToFloorsParams.set("type", type);
  if (subtype) backToFloorsParams.set("subtype", subtype);
  if (area) backToFloorsParams.set("area", area);
  if (schedule) backToFloorsParams.set("schedule", schedule);
  const backToFloorsQuery = backToFloorsParams.toString();

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
          <label className="mb-1 block text-xs text-muted">{t("filters.status")}</label>
          <select
            name="schedule"
            defaultValue={schedule ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allStatuses")}</option>
            {SCHEDULE_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`chart.${value}`)}
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
          href="/admin/dashboard"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-muted hover:bg-background"
        >
          {t("filters.reset")}
        </Link>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <SummaryCard label={t("cards.total")} value={formatNumber(summary.total, locale)} />
        <SummaryCard
          label={t("cards.completed")}
          value={formatNumber(summary.completed, locale)}
          color="green"
        />
        <SummaryCard
          label={t("cards.scheduled")}
          value={formatNumber(summary.scheduled, locale)}
          color="amber"
        />
        <SummaryCard
          label={t("cards.pendingApproval")}
          value={formatNumber(summary.pendingApproval, locale)}
          color="blue"
        />
        <SummaryCard
          label={t("cards.overdue")}
          value={formatNumber(summary.overdue, locale)}
          color="red"
        />
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
