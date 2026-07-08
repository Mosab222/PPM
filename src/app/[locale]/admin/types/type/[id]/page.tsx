import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TypeEditForm, type EditableType } from "@/components/type-edit-form";
import { BackButton } from "@/components/back-button";

export default async function EditTypePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.types.type");

  const supabase = await createClient();
  const { data: type } = await supabase
    .from("equipment_types")
    .select("id, code, name, arabic_name, description, active")
    .eq("id", id)
    .single<EditableType>();

  if (!type) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <h1 className="text-xl font-bold">{t("editTitle")}</h1>
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <TypeEditForm type={type} />
      </div>
    </div>
  );
}
