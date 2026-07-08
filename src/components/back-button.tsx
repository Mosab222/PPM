"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function BackButton() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const Icon = locale === "ar" ? ArrowRight : ArrowLeft;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground print:hidden"
    >
      <Icon className="h-4 w-4" />
      {t("back")}
    </button>
  );
}
