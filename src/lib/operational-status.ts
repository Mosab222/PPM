// Equipment OPERATIONAL status (part 2 of 3) — separate from the SCHEDULING
// status in scheduling.ts. Out-of-service is a manual admin override that
// always wins; otherwise healthy/needs-attention is derived from the latest
// completed maintenance log's result. Computed fresh on every read, never
// stored, so it can't go stale.

export type OperationalStatus = "healthy" | "needs_attention" | "out_of_service";

export function classifyOperationalStatus(params: {
  manualOverride: string | null;
  latestCompletedResult: string | null;
}): OperationalStatus {
  if (params.manualOverride === "out_of_service") return "out_of_service";
  if (params.latestCompletedResult && params.latestCompletedResult !== "passed") return "needs_attention";
  return "healthy";
}

export type OperationalChartDatum = {
  label: string;
  // The value used for drill-down navigation/filtering. Equal to `label` for
  // floor grouping (a floor code IS its own filter value), but distinct from
  // `label` for type grouping, where the bar shows a localized type NAME while
  // the filter/URL needs the type CODE.
  key: string;
  healthy: number;
  needs_attention: number;
  out_of_service: number;
};

export type OperationalSummary = {
  total: number;
  healthy: number;
  needsAttention: number;
  outOfService: number;
};

export function summarizeOperational(buckets: OperationalStatus[]): OperationalSummary {
  const summary: OperationalSummary = { total: buckets.length, healthy: 0, needsAttention: 0, outOfService: 0 };
  for (const bucket of buckets) {
    if (bucket === "healthy") summary.healthy++;
    else if (bucket === "needs_attention") summary.needsAttention++;
    else summary.outOfService++;
  }
  return summary;
}

export function aggregateOperational(
  rows: Array<{
    bucket: OperationalStatus;
    floor: string | null;
    typeCode: string | null;
    typeLabel: string | null;
  }>,
  groupBy: "type" | "floor"
): OperationalChartDatum[] {
  const map = new Map<string, OperationalChartDatum>();

  for (const row of rows) {
    const key = (groupBy === "type" ? row.typeCode : row.floor) || "—";
    const label = (groupBy === "type" ? row.typeLabel ?? row.typeCode : row.floor) || "—";
    if (!map.has(key)) {
      map.set(key, { label, key, healthy: 0, needs_attention: 0, out_of_service: 0 });
    }
    map.get(key)![row.bucket] += 1;
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}
