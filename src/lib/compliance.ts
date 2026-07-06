export type ComplianceBucket = "done" | "scheduled" | "overdue";

export type EquipmentForCompliance = {
  status: string | null;
  next_maintenance_date: string | null;
  facility_code: string | null;
  floor: string | null;
};

export type ComplianceChartDatum = {
  label: string;
  done: number;
  scheduled: number;
  overdue: number;
};

export type ComplianceSummary = {
  total: number;
  compliant: number;
  dueSoon: number;
  overdue: number;
};

const DUE_SOON_WINDOW_DAYS = 30;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Decommissioned equipment is excluded from the 3-bucket compliance model
// entirely (returns null) -- it's retired and no longer tracked for
// maintenance compliance, though it's still counted in the "total" card.
export function classifyCompliance(
  row: Pick<EquipmentForCompliance, "status" | "next_maintenance_date">,
  todayIso: string = toIsoDate(new Date())
): ComplianceBucket | null {
  if (row.status === "decommissioned") return null;
  if (row.status === "overdue") return "overdue";

  if (!row.next_maintenance_date) {
    // Never had a first maintenance yet -- needs scheduling soon.
    return "scheduled";
  }

  if (row.next_maintenance_date < todayIso) {
    return "overdue";
  }

  const cutoff = new Date(todayIso);
  cutoff.setDate(cutoff.getDate() + DUE_SOON_WINDOW_DAYS);

  if (row.next_maintenance_date <= toIsoDate(cutoff)) {
    return "scheduled";
  }

  if (row.status === "due" || row.status === "needs_attention") {
    return "scheduled";
  }

  return "done";
}

export function summarizeCompliance(rows: EquipmentForCompliance[]): ComplianceSummary {
  const todayIso = toIsoDate(new Date());
  const summary: ComplianceSummary = { total: rows.length, compliant: 0, dueSoon: 0, overdue: 0 };

  for (const row of rows) {
    const bucket = classifyCompliance(row, todayIso);
    if (bucket === "done") summary.compliant++;
    else if (bucket === "scheduled") summary.dueSoon++;
    else if (bucket === "overdue") summary.overdue++;
  }

  return summary;
}

export function aggregateCompliance(
  rows: EquipmentForCompliance[],
  groupBy: "facility" | "floor"
): ComplianceChartDatum[] {
  const todayIso = toIsoDate(new Date());
  const map = new Map<string, ComplianceChartDatum>();

  for (const row of rows) {
    const bucket = classifyCompliance(row, todayIso);
    if (!bucket) continue;

    const label = (groupBy === "facility" ? row.facility_code : row.floor) || "—";
    if (!map.has(label)) {
      map.set(label, { label, done: 0, scheduled: 0, overdue: 0 });
    }
    map.get(label)![bucket] += 1;
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}
