// Fixed floor list for data governance -- admin can add equipment to any of
// these, but dashboards/filters only ever show floors that actually have
// equipment (derived from real data, not from this list).
export const FLOOR_OPTIONS = [
  "BF",
  "GF",
  "1F",
  "2F",
  "3F",
  "4F",
  "5F",
  "6F",
  "7F",
  "8F",
  "9F",
  "OUTSIDE",
] as const;

export type FloorOption = (typeof FLOOR_OPTIONS)[number];
