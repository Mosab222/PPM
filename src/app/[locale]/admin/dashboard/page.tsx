import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { SummaryCard } from "@/components/summary-card";
import { ComplianceChart } from "@/components/compliance-chart";
import {
  aggregateCompliance,
  summarizeCompliance,
  type EquipmentForCompliance,
} from "@/lib/compliance";

type EquipmentSubtype = { code: string; name: string; arabic_name: string | null };

const STATUS_VALUES = ["compliant", "due", "overdue", "needs_attention", "decommissioned"] as const;

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    building?: string;
    subtype?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { locale } = await params;
  const { building, subtype, status, from, to } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.dashboard");
  const tStatus = await getTranslations("equipment.status_value");

  const supabase = await createClient();

  let query = supabase
    .from("equipment")
    .select("status, next_maintenance_date, building_code, floor, subtype_code")
    .eq("deleted", false);

  if (building) query = query.eq("building_code", building);
  if (subtype) query = query.eq("subtype_code", subtype);
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("next_maintenance_date", from);
  if (to) query = query.lte("next_maintenance_date", to);

  const { data: equipment } = await query.returns<EquipmentForCompliance[]>();
  const rows = equipment ?? [];

  const summary = summarizeCompliance(rows);
  const chartData = aggregateCompliance(rows, building ? "floor" : "building");

  const [{ data: subtypes }, { data: buildingRows }] = await Promise.all([
    supabase.from("equipment_subtypes").select("code, name, arabic_name").returns<EquipmentSubtype[]>(),
    supabase.from("equipment").select("building_code").eq("deleted", false).not("building_code", "is", null),
  ]);

  const buildings = Array.from(
    new Set((buildingRows ?? []).map((r) => r.building_code as string))
  ).sort();

  const backToBuildingsParams = new URLSearchParams();
  if (subtype) backToBuildingsParams.set("subtype", subtype);
  if (status) backToBuildingsParams.set("status", status);
  if (from) backToBuildingsParams.set("from", from);
  if (to) backToBuildingsParams.set("to", to);
  const backToBuildingsQuery = backToBuildingsParams.toString();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      >
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.building")}</label>
          <select
            name="building"
            defaultValue={building ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allBuildings")}</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filters.subtype")}</label>
          <select
            name="subtype"
            defaultValue={subtype ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allSubtypes")}</option>
            {(subtypes ?? []).map((s) => (
              <option key={s.code} value={s.code}>
                {(locale === "ar" ? s.arabic_name : s.name) || s.name}
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
            {building ? t("chart.byFloorIn", { building }) : t("chart.title")}
          </h2>
          {building && (
            <Link
              href={`/admin/dashboard${backToBuildingsQuery ? `?${backToBuildingsQuery}` : ""}`}
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
            <ComplianceChart data={chartData} locale={locale} drillable={!building} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
