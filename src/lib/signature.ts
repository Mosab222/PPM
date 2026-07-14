import type { SupabaseClient } from "@supabase/supabase-js";

// Duplicates the signer's CURRENT profile signature into a log-scoped path
// at the moment they sign -- a real, independent copy, not a reference. This
// is what makes the profile signature freely redrawable later without ever
// altering what a historical printed report shows: the log's copy is its own
// object, untouched by anything that happens to the profile original after.
export async function copySignatureSnapshot(
  supabase: SupabaseClient,
  params: { fromPath: string; logId: string; role: "technician" | "head" | "manager" }
): Promise<{ url: string | null; error?: string }> {
  const toPath = `logs/${params.logId}/${params.role}.png`;

  const { error: copyError } = await supabase.storage.from("signatures").copy(params.fromPath, toPath);
  if (copyError) {
    return { url: null, error: copyError.message };
  }

  const { data } = supabase.storage.from("signatures").getPublicUrl(toPath);
  return { url: data.publicUrl };
}
