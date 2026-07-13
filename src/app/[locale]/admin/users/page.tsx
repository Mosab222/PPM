import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

type UserRow = {
  id: string;
  full_name: string | null;
  arabic_name: string | null;
  email: string;
  role: "admin" | "technician" | "head" | "manager";
  is_active: boolean;
};

export default async function UsersListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { locale } = await params;
  const { q, role } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.users");

  const supabase = await createClient();
  let query = supabase.from("users").select("id, full_name, arabic_name, email, role, is_active");

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,arabic_name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (role) {
    query = query.eq("role", role);
  }

  const { data: users } = await query
    .order("full_name", { ascending: true })
    .returns<UserRow[]>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("listTitle")}</h1>
        <Link
          href="/admin/users/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t("addNew")}
        </Link>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs text-muted">{t("search")}</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t("filterRole")}</label>
          <select
            name="role"
            defaultValue={role ?? ""}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t("allRoles")}</option>
            <option value="admin">{t("role_value.admin")}</option>
            <option value="technician">{t("role_value.technician")}</option>
            <option value="head">{t("role_value.head")}</option>
            <option value="manager">{t("role_value.manager")}</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-1.5 text-sm font-medium hover:bg-background"
        >
          {t("applyFilters")}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-border text-start text-muted">
              <th className="px-4 py-2 text-start font-medium">{t("table.fullName")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.arabicName")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.email")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.role")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.status")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("table.edit")}</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{u.full_name ?? "—"}</td>
                <td className="px-4 py-2">{u.arabic_name ?? "—"}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{t(`role_value.${u.role}`)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.is_active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {u.is_active ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/admin/users/${u.id}`} className="text-primary underline">
                    {t("table.edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!users || users.length === 0) && (
          <p className="p-6 text-center text-muted">{t("empty")}</p>
        )}
      </div>
    </div>
  );
}
