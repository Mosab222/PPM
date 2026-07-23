"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { PeriodChartDatum, PeriodBucket } from "@/lib/period";
import { currentPeriodKey } from "@/lib/period";
import { fetchPeriodBucketEquipment, type DrilldownEquipmentRow } from "@/app/[locale]/admin/dashboard/actions";
import { SchedulingDrilldownTable } from "@/components/scheduling-drilldown-table";

const COLORS: Record<PeriodBucket, string> = {
  completed: "#16a34a",
  scheduled: "#d97706",
  executed_not_verified: "#2563eb",
  needs_redo: "#ea580c",
  overdue: "#dc2626",
};

const BUCKET_KEYS: PeriodBucket[] = ["completed", "executed_not_verified", "needs_redo", "scheduled", "overdue"];

type Selection = { label: string; bucket: PeriodBucket };

export function ComplianceChart({
  data,
  locale,
}: {
  data: PeriodChartDatum[];
  locale: string;
}) {
  const t = useTranslations("admin.dashboard.chart");
  const searchParams = useSearchParams();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [rows, setRows] = useState<DrilldownEquipmentRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const numberFormatter = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const formatNumber = (value: number) => numberFormatter.format(value);

  // recharts' onClick payload for a Bar segment merges the row's raw data
  // in at the top level (label, completed, scheduled, ...) rather than
  // exposing which dataKey/series was clicked -- so the bucket has to come
  // from the closure below (each Bar's own `key`), not from this argument.
  async function handleBarClick(barData: unknown, bucket: PeriodBucket) {
    const payload = barData as { payload?: { label?: string } };
    const label = payload?.payload?.label;
    if (!label) return;

    setSelection({ label, bucket });
    setRows(null);
    setLoadError(false);
    setLoading(true);

    // The chart groups by floor until a floor is selected (existing "?floor="
    // filter), at which point it re-groups by area within that floor -- so
    // the clicked bar's label means different things depending on which view
    // is currently showing, and has to map to the matching query field.
    const floorParam = searchParams.get("floor") ?? undefined;
    const isAreaView = Boolean(floorParam);
    const periodKey = searchParams.get("period") ?? currentPeriodKey();

    const result = await fetchPeriodBucketEquipment({
      facility: searchParams.get("facility") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      subtype: searchParams.get("subtype") ?? undefined,
      floor: isAreaView ? floorParam : label,
      area: isAreaView ? label : undefined,
      bucket,
      periodKey,
      locale,
    });

    setLoading(false);
    if ("error" in result) {
      setLoadError(true);
      return;
    }
    setRows(result.rows);
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} margin={{ top: 24, left: 0, right: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tickFormatter={formatNumber} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Legend formatter={(value: string) => t(value)} />
          {BUCKET_KEYS.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              fill={COLORS[key]}
              cursor="pointer"
              onClick={(barData) => handleBarClick(barData, key)}
            >
              <LabelList
                dataKey={key}
                position="top"
                formatter={(v) => (Number(v) ? formatNumber(Number(v)) : "")}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      {selection && (
        <SchedulingDrilldownTable
          label={selection.label}
          bucket={selection.bucket}
          rows={rows}
          loading={loading}
          error={loadError}
          locale={locale}
          onClose={() => {
            setSelection(null);
            setRows(null);
          }}
        />
      )}
    </div>
  );
}
