import { useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  done: "bg-green-100 text-green-800",
  scheduled: "bg-amber-100 text-amber-800",
  pending_approval: "bg-blue-100 text-blue-800",
  overdue: "bg-red-100 text-red-800",
};

export function SchedulingStatusBadge({
  status,
}: {
  status: "done" | "scheduled" | "pending_approval" | "overdue";
}) {
  const t = useTranslations("equipment.scheduling_status_value");

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {t(status)}
    </span>
  );
}
