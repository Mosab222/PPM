"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const nextLocale = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => {
        router.replace(
          // @ts-expect-error -- params may include dynamic route params like [id]
          { pathname, params },
          { locale: nextLocale }
        );
      }}
      className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
      aria-label={t("label")}
    >
      {t("switchTo")}
    </button>
  );
}
