import type { OrganizerEventStats } from "../../../lib/events/get-organizer-event-stats";

export function getFallbackStats(eventId: string): OrganizerEventStats {
  return {
    event_id: eventId,

    tickets_sold: 0,
    paid_tickets_sold: 0,
    guest_list_tickets_claimed: 0,

    active_tickets: 0,
    used_tickets: 0,
    cancelled_tickets: 0,

    gross_revenue_cents: 0,

    successful_entrances: 0,
    paid_successful_entrances: 0,
    guest_list_successful_entrances: 0,

    duplicate_scan_attempts: 0,
    invalid_scan_attempts: 0,

    event_remaining_capacity: 0,
    paid_remaining_capacity: 0,
    guest_list_remaining_capacity: 0,

    page_views: 0,
  };
}