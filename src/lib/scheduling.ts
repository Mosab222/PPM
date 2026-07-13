// Preventive-maintenance SCHEDULING status (part 1 of 3). This is deliberately
// separate from the equipment's OPERATIONAL status (healthy / needs-attention
// / out-of-service), which is a future system layered on top later.
//
// Computed fresh from maintenance_logs + equipment.created_at on every read —
// never stored — so it can't go stale.

import { riyadhMonthKey } from "./timezone";

export type SchedulingBucket = "done" | "scheduled" | "pending_approval" | "overdue";

export type SchedulingChartDatum = {
  label: string;
  done: number;
  scheduled: number;
  pending_approval: number;
  overdue: number;
};

export type SchedulingSummary = {
  total: number;
  completed: number;
  scheduled: number;
  pendingApproval: number;
  overdue: number;
};

// "YYYY-MM" in Asia/Riyadh — delegates to the shared timezone helper so every
// "current calendar month" comparison in the app agrees on what month it is,
// regardless of the server's own timezone.
export function monthKey(iso: string): string {
  return riyadhMonthKey(iso);
}

// "YYYY-MM" -> "YYYY-MM" for the previous calendar month, handling year rollover.
export function previousMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Only "monthly" is implemented today. Frequency is threaded through so
// weekly/quarterly/semiannual/yearly can be added as new branches later
// without reshaping this function's contract or its callers.
export function classifySchedulingStatus(params: {
  frequency: string | null;
  createdAt: string;
  hasCurrentMonthApproval: boolean;
  hasPreviousMonthApproval: boolean;
  hasPendingApproval: boolean;
  todayIso?: string;
}): SchedulingBucket {
  const todayIso = params.todayIso ?? new Date().toISOString();
  const currentMonth = monthKey(todayIso);

  if (params.hasCurrentMonthApproval) return "done";

  if (params.hasPendingApproval) return "pending_approval";

  if (monthKey(params.createdAt) === currentMonth) return "scheduled";

  if (params.hasPreviousMonthApproval) return "scheduled";

  return "overdue";
}

export function summarizeScheduling(buckets: SchedulingBucket[]): SchedulingSummary {
  const summary: SchedulingSummary = {
    total: buckets.length,
    completed: 0,
    scheduled: 0,
    pendingApproval: 0,
    overdue: 0,
  };
  for (const bucket of buckets) {
    if (bucket === "done") summary.completed++;
    else if (bucket === "scheduled") summary.scheduled++;
    else if (bucket === "pending_approval") summary.pendingApproval++;
    else summary.overdue++;
  }
  return summary;
}

export function aggregateScheduling(
  rows: Array<{ bucket: SchedulingBucket; floor: string | null; area: string | null }>,
  groupBy: "floor" | "area"
): SchedulingChartDatum[] {
  const map = new Map<string, SchedulingChartDatum>();

  for (const row of rows) {
    const label = (groupBy === "floor" ? row.floor : row.area) || "—";
    if (!map.has(label)) {
      map.set(label, { label, done: 0, scheduled: 0, pending_approval: 0, overdue: 0 });
    }
    map.get(label)![row.bucket] += 1;
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}
