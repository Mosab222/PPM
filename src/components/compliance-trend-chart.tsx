"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

export type TrendDatum = {
  key: string;
  label: string;
  rate: number;
  completed: number;
  total: number;
};

export function ComplianceTrendChart({ data, locale }: { data: TrendDatum[]; locale: string }) {
  const t = useTranslations("admin.dashboard.chart");
  const router = useRouter();
  const searchParams = useSearchParams();

  const numberFormatter = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const percentFormatter = (value: number) => `${numberFormatter.format(Math.round(value * 100))}%`;

  function handlePointClick(barData: unknown) {
    const payload = barData as { payload?: { key?: string } };
    const key = payload?.payload?.key;
    if (!key) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", key);
    router.push(`/admin/dashboard?${params.toString()}`);
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ top: 24, left: 0, right: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 1]} tickFormatter={percentFormatter} allowDecimals={false} />
        <Tooltip
          formatter={(value, _name, item) => {
            const row = (item?.payload ?? {}) as Partial<TrendDatum>;
            return [`${percentFormatter(Number(value))} (${row.completed ?? 0}/${row.total ?? 0})`, t("complianceRate")];
          }}
        />
        <Bar dataKey="rate" name="rate" fill="#2563eb" cursor="pointer" onClick={handlePointClick}>
          <LabelList dataKey="rate" position="top" formatter={(v) => percentFormatter(Number(v))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
