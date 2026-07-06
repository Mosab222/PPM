"use client";

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
import { useRouter } from "@/i18n/navigation";
import type { OperationalChartDatum } from "@/lib/operational-status";

const COLORS = { healthy: "#16a34a", needs_attention: "#d97706", out_of_service: "#dc2626" };

const LEGEND_KEYS: Record<string, "healthy" | "needs_attention" | "out_of_service"> = {
  healthy: "healthy",
  needs_attention: "needs_attention",
  out_of_service: "out_of_service",
};

export function OperationalChart({
  data,
  locale,
  drillable,
}: {
  data: OperationalChartDatum[];
  locale: string;
  drillable: boolean;
}) {
  const t = useTranslations("admin.operationalDashboard.chart");
  const router = useRouter();
  const searchParams = useSearchParams();

  const numberFormatter = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const formatNumber = (value: number) => numberFormatter.format(value);

  function handleBarClick(barData: unknown) {
    if (!drillable) return;
    const payload = barData as { label?: string; payload?: { label?: string } };
    const label = payload?.label ?? payload?.payload?.label;
    if (!label) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("facility", label);
    router.push(`/admin/status?${params.toString()}`);
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ top: 24, left: 0, right: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tickFormatter={formatNumber} />
        <Tooltip formatter={(value) => formatNumber(Number(value))} />
        <Legend formatter={(value: string) => t(LEGEND_KEYS[value] ?? "healthy")} />
        {(["healthy", "needs_attention", "out_of_service"] as const).map((key) => (
          <Bar
            key={key}
            dataKey={key}
            name={key}
            fill={COLORS[key]}
            cursor={drillable ? "pointer" : "default"}
            onClick={handleBarClick}
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
  );
}
