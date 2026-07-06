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
