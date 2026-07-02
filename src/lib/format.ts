export function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatTime(value: string | null, locale: string) {
  if (!value) return "—";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value);
}
