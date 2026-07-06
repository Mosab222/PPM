"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTranslations } from "next-intl";

const COLORS = { healthy: "#16a34a", needs_attention: "#d97706", out_of_service: "#dc2626" };

export type TypeDonutDatum = {
  typeCode: string;
  typeLabel: string;
  healthy: number;
  needsAttention: number;
  outOfService: number;
};

export function OperationalDonutGrid({ donuts, locale }: { donuts: TypeDonutDatum[]; locale: string }) {
  const t = useTranslations("admin.operationalDashboard.chart");
  const tDonuts = useTranslations("admin.operationalDashboard.donuts");
  const numberFormatter = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const formatNumber = (value: number) => numberFormatter.format(value);

  if (donuts.length === 0) {
    return <p className="text-muted">{tDonuts("empty")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {donuts.map((d) => {
        const total = d.healthy + d.needsAttention + d.outOfService;
        const slices = [
          { key: "healthy", value: d.healthy },
          { key: "needs_attention", value: d.needsAttention },
          { key: "out_of_service", value: d.outOfService },
        ];
        return (
          <div key={d.typeCode} className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-center text-sm font-semibold">{d.typeLabel}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {slices.map((s) => (
                    <Cell key={s.key} fill={COLORS[s.key as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [formatNumber(Number(value)), t(String(name))]} />
                <Legend formatter={(value: string) => t(value)} />
              </PieChart>
            </ResponsiveContainer>
            <p className="mt-1 text-center text-xs text-muted">{tDonuts("total", { count: formatNumber(total) })}</p>
          </div>
        );
      })}
    </div>
  );
}
