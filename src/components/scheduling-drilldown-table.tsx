"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMonthYear, formatNumber } from "@/lib/format";
import { SchedulingStatusBadge } from "@/components/scheduling-status-badge";
import type { DrilldownEquipmentRow } from "@/app/[locale]/admin/dashboard/actions";
import type { SchedulingBucket } from "@/lib/scheduling";

export function SchedulingDrilldownTable({
  label,
  bucket,
  rows,
  loading,
  error,
  locale,
  onClose,
}: {
  label: string;
  bucket: SchedulingBucket;
  rows: DrilldownEquipmentRow[] | null;
  loading: boolean;
  error: boolean;
  locale: string;
  onClose: () => void;
}) {
  const t = useTranslations("admin.dashboard.chart");
  const tDrill = useTranslations("admin.dashboard.chart.drilldown");

  const heading = tDrill("heading", {
    status: t(bucket),
    label,
    count: rows ? formatNumber(rows.length, locale) : "…",
  });

  return (
    <div className="mt-4 rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{heading}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted hover:text-foreground"
          aria-label={tDrill("close")}
        >
          {tDrill("close")}
        </button>
      </div>

      {loading && <p className="text-sm text-muted">{tDrill("loading")}</p>}

      {!loading && error && <p className="text-sm text-red-700">{tDrill("error")}</p>}

      {!loading && !error && rows && rows.length === 0 && (
        <p className="text-sm text-muted">{tDrill("empty")}</p>
      )}

      {!loading && !error && rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-border text-start text-muted">
                <th className="px-3 py-2 text-start font-medium">{tDrill("table.code")}</th>
                <th className="px-3 py-2 text-start font-medium">{tDrill("table.type")}</th>
                <th className="px-3 py-2 text-start font-medium">{tDrill("table.floor")}</th>
                <th className="px-3 py-2 text-start font-medium">{tDrill("table.zone")}</th>
                <th className="px-3 py-2 text-start font-medium">{tDrill("table.room")}</th>
                <th className="px-3 py-2 text-start font-medium">{tDrill("table.nextMaintenance")}</th>
                <th className="px-3 py-2 text-start font-medium">{tDrill("table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-card">
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/eq/${row.id}`} className="text-primary underline">
                      {row.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.subtypeLabel}</td>
                  <td className="px-3 py-2">{row.floor ?? "—"}</td>
                  <td className="px-3 py-2">{row.zone ?? "—"}</td>
                  <td className="px-3 py-2">{row.room_code ?? "—"}</td>
                  <td className="px-3 py-2">{formatMonthYear(row.next_maintenance_date, locale)}</td>
                  <td className="px-3 py-2">
                    <SchedulingStatusBadge status={row.bucket} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
