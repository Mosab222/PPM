"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createEquipmentType } from "@/app/[locale]/admin/types/actions";

export function TypeAddForm() {
  const t = useTranslations("admin.types.type");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [arabicName, setArabicName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setCode("");
    setName("");
    setArabicName("");
    setDescription("");
    setError(null);
    setCreated(false);
  }

  function handleSubmit() {
    if (!code.trim() || !name.trim()) {
      setError("missingFields");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createEquipmentType({ code, name, arabicName, description });
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
        <label className="mb-1 block text-sm font-medium">{t("description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
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
