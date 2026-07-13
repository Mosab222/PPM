"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { updateUser } from "@/app/[locale]/admin/users/[id]/actions";

export type EditableUser = {
  id: string;
  full_name: string | null;
  arabic_name: string | null;
  email: string;
  role: "admin" | "technician" | "head" | "manager";
  is_active: boolean;
};

export function UserEditForm({ user }: { user: EditableUser }) {
  const t = useTranslations("admin.users.edit");
  const tRole = useTranslations("admin.users.role_value");
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [arabicName, setArabicName] = useState(user.arabic_name ?? "");
  const [role, setRole] = useState<"admin" | "technician" | "head" | "manager">(user.role);
  const [isActive, setIsActive] = useState(user.is_active);
  const [error, setError] = useState<"unauthorized" | "submitError" | "selfLockout" | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateUser({
        userId: user.id,
        fullName,
        arabicName,
        role,
        isActive,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("email")}</label>
        <p className="text-sm text-muted">{user.email}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("fullName")}</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("arabicName")}</label>
        <input
          type="text"
          value={arabicName}
          onChange={(e) => setArabicName(e.target.value)}
          dir="rtl"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("role")}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "technician" | "head" | "manager")}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="admin">{tRole("admin")}</option>
          <option value="technician">{tRole("technician")}</option>
          <option value="head">{tRole("head")}</option>
          <option value="manager">{tRole("manager")}</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        {t("isActive")}
      </label>

      {error && <p className="text-sm text-red-700">{t(`errors.${error}`)}</p>}
      {saved && <p className="text-sm text-green-700">{t("saved")}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? t("saving") : t("save")}
        </button>
        <Link
          href="/admin/users"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
        >
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
