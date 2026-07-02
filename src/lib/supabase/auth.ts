import { createClient } from "./server";

export type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  arabic_name: string | null;
  role: "admin" | "technician";
  is_active: boolean;
};

// Reads the authenticated Supabase user (if any) and joins it with the
// matching public.users row to get role/name. Returns null when signed out
// or when no matching users row exists.
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, email, full_name, arabic_name, role, is_active")
    .eq("id", user.id)
    .single();

  return (data as AppUser) ?? null;
}
