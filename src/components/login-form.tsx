"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { login, type LoginState } from "@/app/[locale]/login/actions";

function SubmitButton() {
  const t = useTranslations("auth");
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity disabled:opacity-60"
    >
      {pending ? t("submitting") : t("submit")}
    </button>
  );
}

export function LoginForm({
  locale,
  redirectTo,
}: {
  locale: string;
  redirectTo: string | null;
}) {
  const t = useTranslations("auth");
  const initialState: LoginState = { error: null };
  const [state, formAction] = useFormState(
    login.bind(null, locale, redirectTo),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      {state.error && (
        <p className="text-sm text-red-700">{t(`errors.${state.error}`)}</p>
      )}
      <SubmitButton />
    </form>
  );
}
