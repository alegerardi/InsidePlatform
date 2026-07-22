import { createClient } from "../supabase/server";

export type TicketStatus = "active" | "used" | "cancelled";

export type TicketCapacityPool = "paid" | "guest_list";

export type TicketEvent = {
  id: string;
  title: string;
  slug: string | null;
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
  ticket_capacity_pool_snapshot: TicketCapacityPool;
  ticket_code: string;
  qr_token: string;
  status: TicketStatus;
  created_at: string;
  used_at: string | null;
  used_by: string | null;
  events: TicketEvent | null;
};

function normalizeEvent(event: TicketEvent | TicketEvent[] | null): TicketEvent | null {
  if (Array.isArray(event)) {
    return event[0] ?? null;
  }

  return event;
}

export async function getTicket(ticketId: string, userId: string) {
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
      ticket_capacity_pool_snapshot,
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
        location,
        starts_at,
        ends_at,
        status
      )
    `
    )
    .eq("id", ticketId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const ticket = data as Omit<TicketWithEvent, "events"> & {
    events: TicketEvent | TicketEvent[] | null;
  };

  return {
    ...ticket,
    events: normalizeEvent(ticket.events),
  } as TicketWithEvent;
}