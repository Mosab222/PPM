import { cache } from "react";
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
// Wrapped in React's cache() so the several layout/page call sites in a
// single request (root layout, section layout, leaf page) share one lookup
// instead of each re-hitting Supabase Auth + the users table. This is a
// per-request cache reset by the framework on every new request, so it
// carries no cross-request/cross-user staleness risk.
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
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
});
