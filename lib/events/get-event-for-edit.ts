import { createClient } from "../supabase/server";

export type TicketCapacityPool = "paid" | "guest_list";

export type EditableTicketType = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  max_quantity: number | null;
  capacity_pool: TicketCapacityPool;
  is_active: boolean;
  sort_order: number;
};

export type EditableEvent = {
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

export type EventForEdit = {
  event: EditableEvent;
  ticketTypes: EditableTicketType[];
  canEdit: boolean;
};

function isUpcomingEvent(startsAt: string) {
  return new Date(startsAt).getTime() > Date.now();
}

export async function getEventForEdit(
  eventSlug: string
): Promise<EventForEdit | null> {
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, title, slug, description, location, starts_at, ends_at, status, max_tickets, max_guest_list, organizer_id"
    )
    .eq("slug", eventSlug)
    .single();

  if (eventError || !event) {
    return null;
  }

  const { data: ticketTypes, error: ticketTypesError } = await supabase
    .from("ticket_types")
    .select(
      "id, event_id, title, description, price_cents, currency, max_quantity, capacity_pool, is_active, sort_order"
    )
    .eq("event_id", event.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (ticketTypesError || !ticketTypes) {
    return null;
  }

  return {
    event: event as EditableEvent,
    ticketTypes: ticketTypes as EditableTicketType[],
    canEdit: isUpcomingEvent(event.starts_at),
  };
}