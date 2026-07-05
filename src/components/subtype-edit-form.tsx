"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { updateEquipmentSubtype } from "@/app/[locale]/admin/types/actions";

export type EditableSubtype = {
  id: string;
  code: string;
  name: string;
  arabic_name: string | null;
  default_weight: number | null;
  active: boolean;
};

export function SubtypeEditForm({
  subtype,
  parentTypeLabel,
}: {
  subtype: EditableSubtype;
  parentTypeLabel: string;
}) {
  const t = useTranslations("admin.types.subtype");
  const [name, setName] = useState(subtype.name);
  const [arabicName, setArabicName] = useState(subtype.arabic_name ?? "");
  const [defaultWeight, setDefaultWeight] = useState(
    subtype.default_weight != null ? String(subtype.default_weight) : ""
  );
  const [active, setActive] = useState(subtype.active);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError("missingFields");
      return;
    }
    startTransition(async () => {
      const weightValue = defaultWeight.trim() ? Number(defaultWeight) : null;
      const result = await updateEquipmentSubtype({
        id: subtype.id,
        name,
        arabicName,
        active,
        defaultWeight: weightValue != null && !Number.isNaN(weightValue) ? weightValue : null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("parentType")}</label>
        <p className="text-sm text-muted">{parentTypeLabel}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("code")}</label>
        <p className="font-mono text-sm text-muted">{subtype.code}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("name")}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("arabicName")}</label>
        <input
          type="text"
          value={arabicName}
          onChange={(e) => setArabicName(e.target.value)}
          dir="rtl"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("defaultWeight")}</label>
        <input
          type="number"
          value={defaultWeight}
          onChange={(e) => setDefaultWeight(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        {t("active")}
      </label>

      {error && <p className="text-sm text-red-700">{t(`errors.${error}`)}</p>}
      {saved && <p className="text-sm text-green-700">{t("saved")}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? t("saving") : t("save")}
        </button>
        <Link
          href="/admin/types"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
        >
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
