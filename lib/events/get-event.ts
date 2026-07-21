import { createClient } from "../supabase/server";

export type EventStatus =
  | "draft"
  | "published"
  | "active"
  | "completed"
  | "cancelled";

export type TicketCapacityPool = "paid" | "guest_list";

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
  capacity_pool: TicketCapacityPool;
  sort_order: number;
  is_sold_out: boolean;
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

  const { data, error } = await supabase.rpc(
    "get_public_ticket_types_for_event",
    {
      target_event_id: eventId,
    }
  );

  if (error || !data) {
    if (error) {
      console.warn("getPublicTicketTypesForEvent error", {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      });
    }

    return [];
  }

  return data as PublicTicketType[];
}