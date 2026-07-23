// `value` is a plain "YYYY-MM-DD" date that already represents a Saudi
// Arabia (Asia/Riyadh) calendar date — it needs no further timezone
// conversion, just formatting. Parsing it as UTC and formatting in UTC
// (rather than relying on the server/browser's own default timezone) makes
// the output identical everywhere the app runs.
export function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

// `value` ("HH:mm" or "HH:mm:ss") already holds the Saudi Arabia wall-clock
// time — this only pretty-prints it. Building the Date via Date.UTC and
// formatting with timeZone: "UTC" keeps that true regardless of the server
// or browser's own local timezone.
export function formatTime(value: string | null, locale: string) {
  if (!value) return "—";
  const [hours, minutes] = value.split(":");
  const date = new Date(Date.UTC(2000, 0, 1, Number(hours), Number(minutes)));
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

// Same UTC-parse convention as formatDate, but month-precision only -- used
// for next_maintenance_date (informational only) and for period labels
// (whose underlying classification, classifyPeriodStatus, only ever
// enforces a calendar month, never a specific day).
export function formatMonthYear(value: string | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value);
}
