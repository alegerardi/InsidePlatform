import { createClient } from "../supabase/server";

export type UserRole = "client" | "event_organizer" | "event_staff" | "admin";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}