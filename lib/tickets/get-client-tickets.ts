import { createClient } from "../supabase/server";
import type { TicketEvent, TicketWithEvent } from "./get-ticket";

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

export async function getClientTickets(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      id,
      event_id,
      user_id,
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
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as unknown as RawTicketWithEvent[]).map(normalizeTicketEvents);
}