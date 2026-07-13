"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { ResultBadge } from "@/components/result-badge";
import { ApprovalActions } from "@/components/approval-actions";

export type QueueRow = {
  id: string;
  equipmentCode: string;
  typeSubtypeLabel: string;
  floor: string | null;
  zone: string | null;
  roomCode: string | null;
  technicianName: string | null;
  maintenanceDate: string | null;
  result: string | null;
  issuesFound: number;
};

export function ApprovalQueueTable({
  rows,
  canAct,
  locale,
}: {
  rows: QueueRow[];
  canAct: boolean;
  locale: string;
}) {
  const t = useTranslations("approvals");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (rows.length === 0) {
    return <p className="rounded-lg border border-border bg-card p-6 text-center text-muted">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {canAct && <ApprovalActions logIds={Array.from(selected)} onAfterAction="refresh" />}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-border text-start text-muted">
              {canAct && (
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                    aria-label={t("selectAll")}
                  />
                </th>
              )}
              <th className="px-3 py-2 text-start font-medium">{t("table.equipment")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("table.typeSubtype")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("table.location")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("table.technician")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("table.date")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("table.result")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("table.issues")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("table.view")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                {canAct && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={row.equipmentCode}
                    />
                  </td>
                )}
                <td className="px-3 py-2 font-mono">{row.equipmentCode}</td>
                <td className="px-3 py-2">{row.typeSubtypeLabel}</td>
                <td className="px-3 py-2">
                  {[row.floor, row.zone, row.roomCode].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-3 py-2">{row.technicianName ?? "—"}</td>
                <td className="px-3 py-2">{formatDate(row.maintenanceDate, locale)}</td>
                <td className="px-3 py-2">{row.result ? <ResultBadge result={row.result} /> : "—"}</td>
                <td className="px-3 py-2">{row.issuesFound}</td>
                <td className="px-3 py-2">
                  <Link href={`/approvals/${row.id}`} className="text-primary underline">
                    {t("table.view")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
