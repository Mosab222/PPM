// Fixed zone list for data governance -- "Z" is a temporary placeholder zone
// used until real zone assignment is rolled out, kept alongside the real
// zones so existing forms don't break.
export const ZONE_OPTIONS = ["A", "B", "C", "D", "OUTSIDE", "Z"] as const;

export type ZoneOption = (typeof ZONE_OPTIONS)[number];
