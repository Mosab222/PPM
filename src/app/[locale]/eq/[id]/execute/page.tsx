import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { ChecklistForm } from "@/components/checklist-form";
import type { MaintenancePhoto } from "@/app/[locale]/eq/[id]/execute/actions";

type Equipment = {
  id: string;
  type_code: string;
  subtype_code: string;
};

type ChecklistTemplate = {
  id: string;
  equipment_type_code: string;
  equipment_subtype_code: string | null;
  name: string;
  arabic_name: string | null;
};

export type ChecklistItem = {
  id: string;
  question: string;
  arabic_question: string | null;
  item_type: "yes_no" | "number" | "text" | "photo";
  is_required: boolean;
  is_critical: boolean;
  help_text: string | null;
  display_order: number;
};

export default async function ExecuteMaintenancePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/eq/${id}/execute`);
  }

  const t = await getTranslations("checklist");
  const tAuth = await getTranslations("auth");

  if (!user.is_active) {
    return (
      <div className="mx-auto w-full max-w-4xl rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-red-700">{tAuth("inactiveAccount")}</p>
        <Link href={`/eq/${id}`} className="mt-4 inline-block text-sm text-primary underline">
          {t("backToEquipment")}
        </Link>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, type_code, subtype_code")
    .eq("id", id)
    .eq("deleted", false)
    .single<Equipment>();

  if (!equipment) {
    return (
      <div className="mx-auto w-full max-w-4xl rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-red-700">{t("noTemplate")}</p>
        <Link href={`/eq/${id}`} className="mt-4 inline-block text-sm text-primary underline">
          {t("backToEquipment")}
        </Link>
      </div>
    );
  }

  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("id, equipment_type_code, equipment_subtype_code, name, arabic_name")
    .eq("equipment_type_code", equipment.type_code)
    .eq("active", true)
    .or(`equipment_subtype_code.eq.${equipment.subtype_code},equipment_subtype_code.is.null`)
    .order("equipment_subtype_code", { ascending: true, nullsFirst: false })
    .limit(2)
    .returns<ChecklistTemplate[]>();

  const template = templates?.[0];

  if (!template) {
    return (
      <div className="mx-auto w-full max-w-4xl rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-red-700">{t("noTemplate")}</p>
        <Link href={`/eq/${id}`} className="mt-4 inline-block text-sm text-primary underline">
          {t("backToEquipment")}
        </Link>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("checklist_items")
    .select(
      "id, question, arabic_question, item_type, is_required, is_critical, help_text, display_order"
    )
    .eq("checklist_template_id", template.id)
    .order("display_order", { ascending: true })
    .returns<ChecklistItem[]>();

  const templateName = (locale === "ar" ? template.arabic_name : template.name) || template.name;

  // Read-only lookup for a previously started (in_progress) log with its
  // photos, so a technician who left mid-session and came back sees their
  // uploads again. This is a plain SELECT with no side effects, so it's safe
  // to run on every page load/prefetch (unlike creating a new log).
  const { data: existingLog } = await supabase
    .from("maintenance_logs")
    .select("id")
    .eq("equipment_id", equipment.id)
    .eq("technician_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  let initialPhotos: MaintenancePhoto[] = [];
  if (existingLog) {
    const { data: photos } = await supabase
      .from("maintenance_photos")
      .select("id, photo_url, storage_path")
      .eq("maintenance_log_id", existingLog.id)
      .order("created_at", { ascending: true });
    initialPhotos = (photos as MaintenancePhoto[]) ?? [];
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted">{t("title")}</p>
        <p className="mt-1 text-xl font-bold text-primary">{templateName}</p>
        <p className="mt-1 font-mono text-sm text-muted">{equipment.id}</p>
      </div>

      <ChecklistForm
        equipmentId={equipment.id}
        templateId={template.id}
        locale={locale}
        items={items ?? []}
        initialLogId={existingLog?.id ?? null}
        initialPhotos={initialPhotos}
      />
    </div>
  );
}
