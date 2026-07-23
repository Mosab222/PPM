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
import type { SchedulingChartDatum, SchedulingBucket } from "@/lib/scheduling";
import { fetchSchedulingBucketEquipment, type DrilldownEquipmentRow } from "@/app/[locale]/admin/dashboard/actions";
import { SchedulingDrilldownTable } from "@/components/scheduling-drilldown-table";

const COLORS = { done: "#16a34a", scheduled: "#d97706", pending_approval: "#2563eb", overdue: "#dc2626" };

const LEGEND_KEYS: Record<string, "done" | "scheduled" | "pending_approval" | "overdue"> = {
  done: "done",
  scheduled: "scheduled",
  pending_approval: "pending_approval",
  overdue: "overdue",
};

type Selection = { label: string; bucket: SchedulingBucket };

export function ComplianceChart({
  data,
  locale,
}: {
  data: SchedulingChartDatum[];
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
  // in at the top level (label, done, scheduled, ...) rather than exposing
  // which dataKey/series was clicked -- so the bucket has to come from the
  // closure below (each Bar's own `key`), not from this argument.
  async function handleBarClick(barData: unknown, bucket: SchedulingBucket) {
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

    const result = await fetchSchedulingBucketEquipment({
      facility: searchParams.get("facility") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      subtype: searchParams.get("subtype") ?? undefined,
      floor: isAreaView ? floorParam : label,
      area: isAreaView ? label : undefined,
      bucket,
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
          <Legend formatter={(value: string) => t(LEGEND_KEYS[value] ?? "done")} />
          {(["done", "scheduled", "pending_approval", "overdue"] as const).map((key) => (
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
