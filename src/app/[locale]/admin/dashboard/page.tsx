import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { SummaryCard } from "@/components/summary-card";
import { ComplianceChart } from "@/components/compliance-chart";
import { TypeSubtypeFilter, type FilterType, type FilterSubtype } from "@/components/type-subtype-filter";
import {
  aggregateCompliance,
  summarizeCompliance,
  type EquipmentForCompliance,
} from "@/lib/compliance";

const STATUS_VALUES = ["compliant", "due", "overdue", "needs_attention", "decommissioned"] as const;

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    facility?: string;
    type?: string;
    subtype?: string;
    area?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { locale } = await params;
  const { facility, type, subtype, area, status, from, to } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.dashboard");
  const tStatus = await getTranslations("equipment.status_value");

  const supabase = await createClient();

  let query = supabase
    .from("equipment")
    .select("status, next_maintenance_date, facility_code, floor, subtype_code")
    .eq("deleted", false);

  if (facility) query = query.eq("facility_code", facility);
  if (type) query = query.eq("type_code", type);
  if (subtype) query = query.eq("subtype_code", subtype);
  if (area) query = query.eq("area", area);
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("next_maintenance_date", from);
  if (to) query = query.lte("next_maintenance_date", to);

  const { data: equipment } = await query.returns<EquipmentForCompliance[]>();
  const rows = equipment ?? [];

  const summary = summarizeCompliance(rows);
  const chartData = aggregateCompliance(rows, facility ? "floor" : "facility");

  const [{ data: types }, { data: subtypes }, { data: facilityRows }, { data: areaRows }] = await Promise.all([
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
    supabase.from("equipment").select("area").eq("deleted", false).not("area", "is", null),
  ]);

  const facilities = Array.from(
    new Set((facilityRows ?? []).map((r) => r.facility_code as string))
  ).sort();
  const areas = Array.from(
    new Set((areaRows ?? []).map((r) => r.area as string))
  ).sort();

  const backToFacilitiesParams = new URLSearchParams();
  if (type) backToFacilitiesParams.set("type", type);
  if (subtype) backToFacilitiesParams.set("subtype", subtype);
  if (area) backToFacilitiesParams.set("area", area);
  if (status) backToFacilitiesParams.set("status", status);
  if (from) backToFacilitiesParams.set("from", from);
  if (to) backToFacilitiesParams.set("to", to);
  const backToFacilitiesQuery = backToFacilitiesParams.toString();

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
          href="/admin/dashboard"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-muted hover:bg-background"
        >
          {t("filters.reset")}
        </Link>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label={t("cards.total")} value={formatNumber(summary.total, locale)} />
        <SummaryCard
          label={t("cards.compliant")}
          value={formatNumber(summary.compliant, locale)}
          color="green"
        />
        <SummaryCard
          label={t("cards.dueSoon")}
          value={formatNumber(summary.dueSoon, locale)}
          color="amber"
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
            {facility ? t("chart.byFloorIn", { facility }) : t("chart.title")}
          </h2>
          {facility && (
            <Link
              href={`/admin/dashboard${backToFacilitiesQuery ? `?${backToFacilitiesQuery}` : ""}`}
              className="text-sm text-primary underline"
            >
              {t("chart.backToBuildings")}
            </Link>
          )}
        </div>
        {chartData.length === 0 ? (
          <p className="text-muted">{t("chart.empty")}</p>
        ) : (
          <Suspense>
            <ComplianceChart data={chartData} locale={locale} drillable={!facility} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
