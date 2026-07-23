// Period-based maintenance performance model. Replaces the old
// "what is true right now" scheduling.ts with "how did we perform in period
// X" -- a closed period never changes once it ends. See getDuePeriods/
// classifyPeriodStatus below for the two functions that make that true.

import { riyadhDateString, riyadhMonthKey } from "./timezone";

export type PeriodBucket = "completed" | "executed_not_verified" | "needs_redo" | "scheduled" | "overdue";

export type Period = {
  key: string; // "YYYY-MM"
  startDate: string; // "YYYY-MM-DD", Riyadh calendar date, inclusive
  endDate: string; // "YYYY-MM-DD", Riyadh calendar date, inclusive
  isCurrent: boolean;
};

export type LogForClassification = {
  maintenance_date: string;
  approval_status: string;
};

function monthStartEnd(key: string): { startDate: string; endDate: string } {
  const [year, month] = key.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

function nextMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentPeriodKey(): string {
  return riyadhMonthKey(new Date());
}

// Builds a single Period from its key alone -- isCurrent is always derived
// from "now" server-side, never trusted from a caller.
export function derivePeriod(key: string): Period {
  const { startDate, endDate } = monthStartEnd(key);
  return { key, startDate, endDate, isCurrent: key === currentPeriodKey() };
}

// Rule 2: equipment created after a period ends didn't exist for it yet.
export function equipmentExistedBy(
  equipment: { created_at: string },
  period: Pick<Period, "endDate">
): boolean {
  return riyadhDateString(new Date(equipment.created_at)) <= period.endDate;
}

// Enumerate every monthly period key from fromKey to toKey, inclusive.
export function listMonthKeys(fromKey: string, toKey: string): string[] {
  const keys: string[] = [];
  let cursor = fromKey;
  while (cursor <= toKey) {
    keys.push(cursor);
    if (keys.length > 2400) break; // 200-year safety valve, not a real limit
    cursor = nextMonthKey(cursor);
  }
  return keys;
}

// The ONLY function that knows period length. Monthly is the only cadence
// implemented today; quarterly/semiannual are expected future branches here
// -- classifyPeriodStatus never has to change when they're added.
//
// KNOWN LIMITATION: this reads the equipment's CURRENT maintenance_frequency
// with no historical versioning. If an admin changes a unit's frequency,
// every period this function has ever produced for that equipment --
// including already-closed ones -- is recomputed under the new cadence.
// Accepted tradeoff: frequency changes are rare, deliberate admin actions,
// and effective-dated frequency tracking is a lot of machinery to guard
// against a theoretical case that doesn't occur in this hospital's real
// usage today.
export function getDuePeriods(
  equipment: { created_at: string; maintenance_frequency: string | null },
  range: { fromKey: string; toKey: string }
): Period[] {
  return listMonthKeys(range.fromKey, range.toKey)
    .map(derivePeriod)
    .filter((period) => equipmentExistedBy(equipment, period)); // rule: created after period ends -> not counted
}

// Receives period boundaries, not a period length -- doesn't know or care
// how long the period is. Rules, in order:
//   approved log dated within period      -> completed
//   pending log dated within period       -> executed_not_verified
//   only rejected log(s), period current  -> needs_redo (derived, never stored)
//   nothing, period current               -> scheduled
//   nothing or only rejected, period past -> overdue (permanent)
export function classifyPeriodStatus(period: Period, logs: LogForClassification[]): PeriodBucket {
  const inPeriod = logs.filter(
    (l) => l.maintenance_date >= period.startDate && l.maintenance_date <= period.endDate
  );
  if (inPeriod.some((l) => l.approval_status === "approved")) return "completed";
  if (inPeriod.some((l) => l.approval_status === "pending_head" || l.approval_status === "pending_manager")) {
    return "executed_not_verified";
  }
  if (inPeriod.length > 0) return period.isCurrent ? "needs_redo" : "overdue"; // only rejected left
  return period.isCurrent ? "scheduled" : "overdue";
}

// True when dateStr's Riyadh calendar month is strictly before the current
// Riyadh month -- i.e. its period has closed. Mirrors the DB-side
// guard_maintenance_date/guard_approval_columns triggers exactly, so a UI
// hint here never disagrees with what the server will actually enforce.
export function isDateInClosedPeriod(dateStr: string): boolean {
  return riyadhMonthKey(dateStr) < currentPeriodKey();
}

export type PeriodChartDatum = {
  label: string;
  completed: number;
  executed_not_verified: number;
  needs_redo: number;
  scheduled: number;
  overdue: number;
};

export function aggregatePeriodStatuses(
  rows: Array<{ bucket: PeriodBucket; floor: string | null; area: string | null }>,
  groupBy: "floor" | "area"
): PeriodChartDatum[] {
  const map = new Map<string, PeriodChartDatum>();
  for (const row of rows) {
    const label = (groupBy === "floor" ? row.floor : row.area) || "—";
    if (!map.has(label)) {
      map.set(label, {
        label,
        completed: 0,
        executed_not_verified: 0,
        needs_redo: 0,
        scheduled: 0,
        overdue: 0,
      });
    }
    map.get(label)![row.bucket] += 1;
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export type PeriodSummary = {
  total: number;
  completed: number;
  executedNotVerified: number;
  needsRedo: number;
  scheduled: number;
  overdue: number;
};

export function summarizePeriodBuckets(buckets: PeriodBucket[]): PeriodSummary {
  const summary: PeriodSummary = {
    total: buckets.length,
    completed: 0,
    executedNotVerified: 0,
    needsRedo: 0,
    scheduled: 0,
    overdue: 0,
  };
  for (const bucket of buckets) {
    if (bucket === "completed") summary.completed++;
    else if (bucket === "executed_not_verified") summary.executedNotVerified++;
    else if (bucket === "needs_redo") summary.needsRedo++;
    else if (bucket === "scheduled") summary.scheduled++;
    else summary.overdue++;
  }
  return summary;
}

export function complianceRate(summary: { completed: number; total: number }): number {
  return summary.total > 0 ? summary.completed / summary.total : 0;
}
