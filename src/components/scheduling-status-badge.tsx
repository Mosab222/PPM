import { useTranslations } from "next-intl";
import type { PeriodBucket } from "@/lib/period";

const STYLES: Record<PeriodBucket, string> = {
  completed: "bg-green-100 text-green-800",
  scheduled: "bg-amber-100 text-amber-800",
  executed_not_verified: "bg-blue-100 text-blue-800",
  needs_redo: "bg-orange-100 text-orange-800",
  overdue: "bg-red-100 text-red-800",
};

export function SchedulingStatusBadge({ status }: { status: PeriodBucket }) {
  const t = useTranslations("equipment.scheduling_status_value");

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {t(status)}
    </span>
  );
}
