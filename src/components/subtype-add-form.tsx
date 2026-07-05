"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createEquipmentSubtype } from "@/app/[locale]/admin/types/actions";

export type ParentTypeOption = {
  id: string;
  code: string;
  name: string;
  arabic_name: string | null;
  active: boolean;
};

export function SubtypeAddForm({
  types,
  locale,
  defaultParentId,
}: {
  types: ParentTypeOption[];
  locale: string;
  defaultParentId?: string;
}) {
  const t = useTranslations("admin.types.subtype");
  const [parentTypeId, setParentTypeId] = useState(defaultParentId ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [arabicName, setArabicName] = useState("");
  const [defaultWeight, setDefaultWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [isPending, startTransition] = useTransition();

  function typeLabel(type: ParentTypeOption) {
    return (locale === "ar" ? type.arabic_name : type.name) || type.name;
  }

  function resetForm() {
    setParentTypeId(defaultParentId ?? "");
    setCode("");
    setName("");
    setArabicName("");
    setDefaultWeight("");
    setError(null);
    setCreated(false);
  }

  function handleSubmit() {
    if (!parentTypeId || !code.trim() || !name.trim()) {
      setError("missingFields");
      return;
    }
    setError(null);
    startTransition(async () => {
      const weightValue = defaultWeight.trim() ? Number(defaultWeight) : null;
      const result = await createEquipmentSubtype({
        parentTypeId,
        code,
        name,
        arabicName,
        defaultWeight: weightValue != null && !Number.isNaN(weightValue) ? weightValue : null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreated(true);
    });
  }

  if (created) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm font-medium text-green-800">{t("created")}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
          >
            {t("addAnother")}
          </button>
          <Link
            href="/admin/types"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("back")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("parentType")}</label>
        <select
          value={parentTypeId}
          onChange={(e) => setParentTypeId(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t("selectParentType")}</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {typeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("code")}</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          dir="ltr"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
        />
        <p className="mt-1 text-xs text-muted">{t("codeHint")}</p>
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

      {error && <p className="text-sm text-red-700">{t(`errors.${error}`)}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? t("submitting") : t("submit")}
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
