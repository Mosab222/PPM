"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error: "missingFields" | "invalidCredentials" | null;
};

// Only allow same-origin relative paths as a redirect target to avoid
// open-redirect vulnerabilities from an attacker-controlled `next` param.
function safeRedirectTarget(target: string | null, fallback: string) {
  if (target && target.startsWith("/") && !target.startsWith("//") && !target.includes("://")) {
    return target;
  }
  return fallback;
}

export async function login(
  locale: string,
  redirectTo: string | null,
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "missingFields" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "invalidCredentials" };
  }

  redirect(safeRedirectTarget(redirectTo, `/${locale}`));
}

export async function logout(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
