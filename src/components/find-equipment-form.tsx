"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function FindEquipmentForm() {
  const t = useTranslations("tech.find");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError(true);
      return;
    }
    setError(false);
    router.push(`/eq/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("placeholder")}
        dir="ltr"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-center font-mono text-sm"
      />
      {error && <p className="text-sm text-red-700">{t("error")}</p>}
      <button
        type="submit"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {t("openButton")}
      </button>
    </form>
  );
}
