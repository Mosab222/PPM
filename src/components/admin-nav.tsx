"use client";

import { LayoutDashboard, Wrench, Users, FileBarChart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const NAV_ITEMS = [
  { href: "/admin/dashboard", key: "dashboard", Icon: LayoutDashboard },
  { href: "/admin/equipment", key: "equipment", Icon: Wrench },
  { href: "/admin/users", key: "users", Icon: Users },
  { href: "/admin/reports", key: "reports", Icon: FileBarChart },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 border-e border-border lg:block lg:w-56">
        <nav className="sticky top-16 flex flex-col gap-1 p-4">
          {NAV_ITEMS.map(({ href, key, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-background"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(key)}
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
