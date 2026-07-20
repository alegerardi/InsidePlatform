import { createClient } from "../supabase/server";

export type EventStatus = "draft" | "published" | "active" | "completed" | "cancelled";

export type EventRecord = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: EventStatus;
  max_tickets: number;
  max_guest_list: number;
  organizer_id: string;
  created_at: string;
  updated_at: string;
};

export async function getPublicEventBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, slug, description, location, starts_at, ends_at, status, max_tickets, max_guest_list, organizer_id, created_at, updated_at"
    )
    .eq("slug", slug)
    .in("status", ["published", "active"])
    .single();

  if (error || !data) {
    return null;
  }

  return data as EventRecord;
}