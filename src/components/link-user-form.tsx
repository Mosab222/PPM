"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { linkUser } from "@/app/[locale]/admin/users/new/actions";

export function LinkUserForm({ locale }: { locale: string }) {
  const t = useTranslations("admin.users.new");
  const tRole = useTranslations("admin.users.role_value");
  const [authUserId, setAuthUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [arabicName, setArabicName] = useState("");
  const [role, setRole] = useState<"admin" | "technician">("technician");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!authUserId.trim() || !email.trim() || !fullName.trim()) {
      setError("missingFields");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await linkUser({
        locale,
        authUserId,
        email,
        fullName,
        arabicName,
        role,
        isActive,
      });
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("helpText")}</p>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("authUserId")}</label>
        <input
          type="text"
          value={authUserId}
          onChange={(e) => setAuthUserId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
          dir="ltr"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("email")}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          dir="ltr"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("fullName")}</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
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
          onChange={(e) => setRole(e.target.value as "admin" | "technician")}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="technician">{tRole("technician")}</option>
          <option value="admin">{tRole("admin")}</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        {t("isActive")}
      </label>

      {error && <p className="text-sm text-red-700">{t(`errors.${error}`)}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>
    </div>
  );
}
