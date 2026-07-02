import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { UserEditForm, type EditableUser } from "@/components/user-edit-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.users.edit");

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, arabic_name, email, role, is_active")
    .eq("id", id)
    .single<EditableUser>();

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <UserEditForm user={user} />
      </div>
    </div>
  );
}
