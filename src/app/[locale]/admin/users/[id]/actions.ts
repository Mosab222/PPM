"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export type UpdateUserInput = {
  userId: string;
  fullName: string;
  arabicName: string;
  role: "admin" | "technician" | "head" | "manager";
  isActive: boolean;
};

export type UpdateUserResult = { error?: "unauthorized" | "submitError" | "selfLockout" };

export async function updateUser(input: UpdateUserInput): Promise<UpdateUserResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "unauthorized" };
  }

  // An admin editing their own row can't demote themselves or deactivate
  // their own account — either would lock them out of admin with no other
  // admin able to fix it from within the app.
  if (currentUser.id === input.userId && (input.role !== "admin" || !input.isActive)) {
    return { error: "selfLockout" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({
      full_name: input.fullName.trim() || null,
      arabic_name: input.arabicName.trim() || null,
      role: input.role,
      is_active: input.isActive,
    })
    .eq("id", input.userId);

  if (error) {
    return { error: "submitError" };
  }

  revalidatePath("/admin/users");
  return {};
}
