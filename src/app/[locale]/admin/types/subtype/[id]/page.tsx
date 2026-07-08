import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SubtypeEditForm, type EditableSubtype } from "@/components/subtype-edit-form";
import { BackButton } from "@/components/back-button";

type SubtypeWithParent = EditableSubtype & { parent_type_id: string };

export default async function EditSubtypePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.types.subtype");

  const supabase = await createClient();
  const { data: subtype } = await supabase
    .from("equipment_subtypes")
    .select("id, code, parent_type_id, name, arabic_name, default_weight, active")
    .eq("id", id)
    .single<SubtypeWithParent>();

  if (!subtype) {
    notFound();
  }

  const { data: parentType } = await supabase
    .from("equipment_types")
    .select("name, arabic_name")
    .eq("id", subtype.parent_type_id)
    .single<{ name: string; arabic_name: string | null }>();

  const parentTypeLabel = parentType
    ? (locale === "ar" ? parentType.arabic_name : parentType.name) || parentType.name
    : "—";

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <h1 className="text-xl font-bold">{t("editTitle")}</h1>
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <SubtypeEditForm subtype={subtype} parentTypeLabel={parentTypeLabel} />
      </div>
    </div>
  );
}
