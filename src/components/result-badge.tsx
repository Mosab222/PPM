import { useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  passed: "bg-green-100 text-green-800",
  needs_attention: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
};

export function ResultBadge({ result }: { result: string }) {
  const t = useTranslations("equipment.result");
  const style = STYLES[result] ?? "bg-slate-100 text-slate-800";

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {t(result as "passed" | "needs_attention" | "failed")}
    </span>
  );
}
