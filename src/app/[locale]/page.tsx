import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");

  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="text-2xl font-bold">{t("name")}</h1>
      <p className="text-muted">{t("tagline")}</p>
    </div>
  );
}
