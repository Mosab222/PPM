"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export type LinkUserInput = {
  locale: string;
  authUserId: string;
  email: string;
  fullName: string;
  arabicName: string;
  role: "admin" | "technician";
  isActive: boolean;
};

export type LinkUserResult = {
  error?: "unauthorized" | "invalidId" | "duplicateUser" | "authUserNotFound" | "submitError";
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function linkUser(input: LinkUserInput): Promise<LinkUserResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "unauthorized" };
  }

  const authUserId = input.authUserId.trim();
  if (!UUID_PATTERN.test(authUserId)) {
    return { error: "invalidId" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("users").insert({
    id: authUserId,
    email: input.email.trim(),
    full_name: input.fullName.trim() || null,
    arabic_name: input.arabicName.trim() || null,
    role: input.role,
    is_active: input.isActive,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "duplicateUser" };
    }
    if (error.code === "23503") {
      return { error: "authUserNotFound" };
    }
    return { error: "submitError" };
  }

  redirect(`/${input.locale}/admin/users`);
}
