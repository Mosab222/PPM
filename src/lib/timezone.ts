// Single source of truth for Saudi Arabia local time (Asia/Riyadh, fixed
// UTC+3, no daylight saving). Anything that needs to turn a real instant
// (e.g. `new Date()` at submit time, or a timestamptz like equipment.created_at)
// into a Riyadh wall-clock value should go through here instead of doing its
// own offset math.

const RIYADH_TIME_ZONE = "Asia/Riyadh";

function riyadhParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

// "YYYY-MM-DD" for the given instant, in Asia/Riyadh — for maintenance_date.
export function riyadhDateString(date: Date = new Date()): string {
  const p = riyadhParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

// "HH:mm:ss" for the given instant, in Asia/Riyadh — for maintenance_time.
export function riyadhTimeString(date: Date = new Date()): string {
  const p = riyadhParts(date);
  return `${p.hour}:${p.minute}:${p.second}`;
}

// "YYYY-MM" for the given instant, in Asia/Riyadh — for month-based scheduling
// comparisons. Safe on both a genuine UTC timestamp (equipment.created_at) and
// a plain "YYYY-MM-DD" date that already represents a Riyadh calendar date:
// such a string parses as UTC midnight, and Riyadh's +3 offset never pushes
// UTC midnight into a different calendar day.
export function riyadhMonthKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const p = riyadhParts(date);
  return `${p.year}-${p.month}`;
}
