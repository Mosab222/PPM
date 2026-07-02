"use client";

import * as XLSX from "xlsx";
import { useTranslations } from "next-intl";
import { formatDate, formatTime } from "@/lib/format";

export type ReportRow = {
  id: string;
  equipmentCode: string;
  building: string | null;
  floor: string | null;
  location: string | null;
  subtype: string | null;
  maintenanceDate: string | null;
  maintenanceTime: string | null;
  technicianName: string | null;
  result: string | null;
  issuesFound: number | null;
};

export function ExportExcelButton({ rows, locale }: { rows: ReportRow[]; locale: string }) {
  const t = useTranslations("admin.reports");
  const tTable = useTranslations("admin.reports.table");
  const tResult = useTranslations("equipment.result");

  function handleExport() {
    const data = rows.map((row) => ({
      [tTable("code")]: row.equipmentCode,
      [tTable("building")]: row.building ?? "",
      [tTable("floor")]: row.floor ?? "",
      [tTable("location")]: row.location ?? "",
      [tTable("subtype")]: row.subtype ?? "",
      [tTable("date")]: formatDate(row.maintenanceDate, locale),
      [tTable("time")]: formatTime(row.maintenanceTime, locale),
      [tTable("technician")]: row.technicianName ?? "",
      [tTable("result")]: row.result
        ? tResult(row.result as "passed" | "needs_attention" | "failed")
        : "",
      [tTable("issues")]: row.issuesFound ?? 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const dateStamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `maintenance-report-${dateStamp}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={rows.length === 0}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
    >
      {t("downloadExcel")}
    </button>
  );
}
