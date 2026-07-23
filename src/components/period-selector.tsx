"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

export function PeriodSelector({
  periods,
  selected,
}: {
  periods: Array<{ key: string; label: string }>;
  selected: string;
}) {
  const t = useTranslations("admin.dashboard.filters");
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`/admin/dashboard?${params.toString()}`);
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{t("period")}</label>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      >
        {periods.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
        <option value="all">{t("allPeriods")}</option>
      </select>
    </div>
  );
}
