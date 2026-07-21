import { createClient } from "../supabase/server";

export type EventStatus =
  | "draft"
  | "published"
  | "active"
  | "completed"
  | "cancelled";

export type EventRecord = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: EventStatus;
  organizer_id: string;
  created_at: string;
  updated_at: string;
};

export type PublicTicketType = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  sort_order: number;
};

export async function getPublicEventBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, slug, description, location, starts_at, ends_at, status, organizer_id, created_at, updated_at"
    )
    .eq("slug", slug)
    .in("status", ["published", "active"])
    .single();

  if (error || !data) {
    return null;
  }

  return data as EventRecord;
}

export async function getPublicTicketTypesForEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ticket_types")
    .select("id, event_id, title, description, price_cents, currency, sort_order")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as PublicTicketType[];
}