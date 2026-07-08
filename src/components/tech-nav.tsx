"use client";

import { useState } from "react";
import { QrCode, ClipboardList, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { setSidebarCollapsedCookie } from "@/lib/sidebar-cookie";

const NAV_ITEMS = [
  { href: "/tech/find", key: "find", Icon: QrCode },
  { href: "/tech/records", key: "records", Icon: ClipboardList },
] as const;

export function TechNav({ initialCollapsed }: { initialCollapsed: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("tech.nav");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      setSidebarCollapsedCookie(next);
      return next;
    });
  }

  const ToggleIcon = collapsed ? (isRtl ? ChevronsLeft : ChevronsRight) : isRtl ? ChevronsRight : ChevronsLeft;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-e border-border transition-[width] duration-200 lg:block print:hidden ${
          collapsed ? "lg:w-16" : "lg:w-56"
        }`}
      >
        <nav className="sticky top-16 flex flex-col gap-1 p-4">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={t("toggleSidebar")}
            title={t("toggleSidebar")}
            className={`mb-2 flex items-center rounded-md p-2 text-muted transition-colors hover:bg-background hover:text-foreground ${
              collapsed ? "justify-center" : "justify-end"
            }`}
          >
            <ToggleIcon className="h-4 w-4 shrink-0" />
          </button>
          {NAV_ITEMS.map(({ href, key, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? t(key) : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && t(key)}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card lg:hidden">
        {NAV_ITEMS.map(({ href, key, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
