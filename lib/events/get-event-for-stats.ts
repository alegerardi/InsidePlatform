import { createClient } from "../supabase/server";

export type StatsEvent = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: "draft" | "published" | "active" | "completed" | "cancelled";
  max_tickets: number;
  max_guest_list: number;
  organizer_id: string;
};

export async function getEventForStats(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, slug, description, location, starts_at, ends_at, status, max_tickets, max_guest_list, organizer_id"
    )
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as StatsEvent;
}