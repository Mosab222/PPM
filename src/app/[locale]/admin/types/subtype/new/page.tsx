import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SubtypeAddForm, type ParentTypeOption } from "@/components/subtype-add-form";

export default async function NewSubtypePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ parent?: string }>;
}) {
  const { locale } = await params;
  const { parent } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.types.subtype");

  const supabase = await createClient();
  const { data: types } = await supabase
    .from("equipment_types")
    .select("id, code, name, arabic_name, active")
    .order("code")
    .returns<ParentTypeOption[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t("newTitle")}</h1>
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <SubtypeAddForm types={types ?? []} locale={locale} defaultParentId={parent} />
      </div>
    </div>
  );
}
