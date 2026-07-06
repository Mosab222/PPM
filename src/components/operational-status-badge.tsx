import { useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  healthy: "bg-green-100 text-green-800",
  needs_attention: "bg-amber-100 text-amber-800",
  out_of_service: "bg-red-100 text-red-800",
};

export function OperationalStatusBadge({
  status,
}: {
  status: "healthy" | "needs_attention" | "out_of_service";
}) {
  const t = useTranslations("equipment.operational_status_value");

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {t(status)}
    </span>
  );
}
