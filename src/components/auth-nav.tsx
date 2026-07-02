import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { logout } from "@/app/[locale]/login/actions";
import type { AppUser } from "@/lib/supabase/auth";

export async function AuthNav({
  user,
  locale,
}: {
  user: AppUser | null;
  locale: string;
}) {
  const tNav = await getTranslations("nav");
  const tAuth = await getTranslations("auth");

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
      >
        {tNav("login")}
      </Link>
    );
  }

  const displayName =
    (locale === "ar" ? user.arabic_name : user.full_name) ||
    user.full_name ||
    user.arabic_name ||
    user.email;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted">
        {tAuth("loggedInAs")} <span className="font-medium text-foreground">{displayName}</span>
      </span>
      <form action={logout.bind(null, locale)}>
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          {tAuth("logout")}
        </button>
      </form>
    </div>
  );
}
