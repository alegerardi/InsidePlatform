import { createClient } from "../supabase/server";

export type TicketStatus =
  | "active"
  | "used"
  | "cancelled"
  | "expired"
  | "invalid";

export type TicketEvent = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
};

export type TicketWithEvent = {
  id: string;
  event_id: string;
  user_id: string;
  ticket_type_id: string | null;
  ticket_type_title_snapshot: string | null;
  ticket_price_cents_snapshot: number;
  ticket_currency_snapshot: string;
  ticket_code: string;
  qr_token: string;
  status: TicketStatus;
  created_at: string;
  used_at: string | null;
  used_by: string | null;
  events: TicketEvent | null;
};

type RawTicketWithEvent = Omit<TicketWithEvent, "events"> & {
  events: TicketEvent | TicketEvent[] | null;
};

function normalizeTicketEvents(ticket: RawTicketWithEvent): TicketWithEvent {
  const event = Array.isArray(ticket.events)
    ? ticket.events[0] ?? null
    : ticket.events;

  return {
    ...ticket,
    events: event,
  };
}

export async function getTicketById(ticketId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      id,
      event_id,
      user_id,
      ticket_type_id,
      ticket_type_title_snapshot,
      ticket_price_cents_snapshot,
      ticket_currency_snapshot,
      ticket_code,
      qr_token,
      status,
      created_at,
      used_at,
      used_by,
      events (
        id,
        title,
        slug,
        description,
        location,
        starts_at,
        ends_at,
        status
      )
    `
    )
    .eq("id", ticketId)
    .single();

  if (error || !data) {
    return null;
  }

  return normalizeTicketEvents(data as unknown as RawTicketWithEvent);
}