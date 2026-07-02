import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Inter, Tajawal } from "next/font/google";
import { routing } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AuthNav } from "@/components/auth-nav";
import { getCurrentUser } from "@/lib/supabase/auth";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-en",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ar",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  return {
    title: t("name"),
    description: t("tagline"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const user = await getCurrentUser();

  return (
    <html lang={locale} dir={dir}>
      <body
        className={`${inter.variable} ${tajawal.variable} ${
          locale === "ar" ? "font-ar" : "font-en"
        } bg-background text-foreground antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-border bg-card">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-lg font-bold text-primary">PPM</span>
                <div className="flex items-center gap-3">
                  <AuthNav user={user} locale={locale} />
                  <LanguageSwitcher />
                </div>
              </div>
            </header>
            <main className="w-full flex-1 px-4 py-6">{children}</main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
