import { useMessages, useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  compliant: "bg-green-100 text-green-800",
  due: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  needs_attention: "bg-amber-100 text-amber-800",
  decommissioned: "bg-slate-100 text-slate-800",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("equipment.status_value");
  const messages = useMessages() as {
    equipment?: { status_value?: Record<string, string> };
  };
  const style = STYLES[status] ?? "bg-slate-100 text-slate-800";
  const hasTranslation = Boolean(messages.equipment?.status_value?.[status]);

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {hasTranslation ? t(status as keyof typeof STYLES) : status}
    </span>
  );
}
