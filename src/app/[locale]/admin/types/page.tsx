import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

type TypeRow = {
  id: string;
  code: string;
  name: string;
  arabic_name: string | null;
  description: string | null;
  active: boolean;
};

type SubtypeRow = {
  id: string;
  code: string;
  parent_type_id: string;
  name: string;
  arabic_name: string | null;
  default_weight: number | null;
  active: boolean;
};

export default async function TypesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.types");

  const supabase = await createClient();
  const [{ data: types }, { data: subtypes }] = await Promise.all([
    supabase
      .from("equipment_types")
      .select("id, code, name, arabic_name, description, active")
      .order("code")
      .returns<TypeRow[]>(),
    supabase
      .from("equipment_subtypes")
      .select("id, code, parent_type_id, name, arabic_name, default_weight, active")
      .order("code")
      .returns<SubtypeRow[]>(),
  ]);

  const subtypesByParent = new Map<string, SubtypeRow[]>();
  for (const s of subtypes ?? []) {
    const list = subtypesByParent.get(s.parent_type_id) ?? [];
    list.push(s);
    subtypesByParent.set(s.parent_type_id, list);
  }

  function label(name: string, arabicName: string | null) {
    return (locale === "ar" ? arabicName : name) || name;
  }

  function badge(active: boolean) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
        }`}
      >
        {active ? t("activeBadge") : t("inactiveBadge")}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/types/subtype/new"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
          >
            {t("addSubtype")}
          </Link>
          <Link
            href="/admin/types/type/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("addType")}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {(types ?? []).map((type) => {
          const typeSubtypes = subtypesByParent.get(type.id) ?? [];
          return (
            <div key={type.id} className="rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-background px-2 py-0.5 font-mono text-xs">
                    {type.code}
                  </span>
                  <span className="font-semibold">{label(type.name, type.arabic_name)}</span>
                  {badge(type.active)}
                </div>
                <Link
                  href={`/admin/types/type/${type.id}`}
                  className="text-sm text-primary underline"
                >
                  {t("edit")}
                </Link>
              </div>

              <div className="flex flex-col gap-2 p-4">
                {typeSubtypes.length === 0 && (
                  <p className="text-sm text-muted">{t("noSubtypes")}</p>
                )}
                <Link
                  href={`/admin/types/subtype/new?parent=${type.id}`}
                  className="self-start text-sm text-primary underline"
                >
                  {t("addSubtype")}
                </Link>
                {typeSubtypes.map((subtype) => (
                  <div
                    key={subtype.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded bg-background px-2 py-0.5 font-mono text-xs">
                        {subtype.code}
                      </span>
                      <span className="text-sm">{label(subtype.name, subtype.arabic_name)}</span>
                      {subtype.default_weight != null && (
                        <span className="text-xs text-muted">
                          {subtype.default_weight} {t("kg")}
                        </span>
                      )}
                      {badge(subtype.active)}
                    </div>
                    <Link
                      href={`/admin/types/subtype/${subtype.id}`}
                      className="text-sm text-primary underline"
                    >
                      {t("edit")}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {(!types || types.length === 0) && (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-muted">
            {t("empty")}
          </p>
        )}
      </div>
    </div>
  );
}
