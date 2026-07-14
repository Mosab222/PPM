"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export type SaveSignatureResult = { error?: "unauthorized" | "saveError" };

export async function saveSignature(input: { url: string; path: string }): Promise<SaveSignatureResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "unauthorized" };
  }

  const supabase = await createClient();

  const previousPath = user.signature_storage_path;

  const { error } = await supabase
    .from("users")
    .update({ signature_url: input.url, signature_storage_path: input.path })
    .eq("id", user.id);

  if (error) {
    return { error: "saveError" };
  }

  // Best-effort cleanup of the old profile signature file. Safe to do now --
  // any log already signed has its OWN independent copy (see
  // copySignatureSnapshot), so nothing historical depends on this path.
  if (previousPath && previousPath !== input.path) {
    await supabase.storage.from("signatures").remove([previousPath]);
  }

  revalidatePath("/account");
  return {};
}
