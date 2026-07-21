import { createClient } from "../supabase/server";

export type OrganizerEventStats = {
  event_id: string;
  tickets_sold: number;
  active_tickets: number;
  used_tickets: number;
  cancelled_tickets: number;
  gross_revenue_cents: number;
  successful_entrances: number;
  duplicate_scan_attempts: number;
  invalid_scan_attempts: number;
  event_remaining_capacity: number;
  page_views: number;
};

export type OrganizerTicketTypeStats = {
  event_id: string;
  ticket_type_id: string;
  ticket_type_title: string;
  price_cents: number;
  currency: string;
  max_quantity: number | null;
  is_active: boolean;
  sort_order: number;
  sold_count: number;
  active_count: number;
  used_count: number;
  successful_entrances: number;
  gross_revenue_cents: number;
  remaining_quantity: number | null;
};

export type OrganizerEntranceTimeStats = {
  event_id: string;
  bucket_start: string;
  successful_entrances: number;
};

export type OrganizerStatsData = {
  eventStats: OrganizerEventStats[];
  ticketTypeStats: OrganizerTicketTypeStats[];
  entranceTimeStats: OrganizerEntranceTimeStats[];
};

export async function getOrganizerStatsData(): Promise<OrganizerStatsData> {
  const supabase = await createClient();

  const [
    { data: eventStats, error: eventStatsError },
    { data: ticketTypeStats, error: ticketTypeStatsError },
    { data: entranceTimeStats, error: entranceTimeStatsError },
  ] = await Promise.all([
    supabase.rpc("get_my_organizer_event_stats"),
    supabase.rpc("get_my_organizer_ticket_type_stats"),
    supabase.rpc("get_my_organizer_entrance_time_stats"),
  ]);

  if (eventStatsError) {
    console.error("getOrganizerStatsData event stats error", {
      errorCode: eventStatsError.code,
      errorMessage: eventStatsError.message,
      errorDetails: eventStatsError.details,
      errorHint: eventStatsError.hint,
    });
  }

  if (ticketTypeStatsError) {
    console.error("getOrganizerStatsData ticket type stats error", {
      errorCode: ticketTypeStatsError.code,
      errorMessage: ticketTypeStatsError.message,
      errorDetails: ticketTypeStatsError.details,
      errorHint: ticketTypeStatsError.hint,
    });
  }

  if (entranceTimeStatsError) {
    console.error("getOrganizerStatsData entrance time stats error", {
      errorCode: entranceTimeStatsError.code,
      errorMessage: entranceTimeStatsError.message,
      errorDetails: entranceTimeStatsError.details,
      errorHint: entranceTimeStatsError.hint,
    });
  }

  return {
    eventStats:
      eventStatsError || !eventStats ? [] : (eventStats as OrganizerEventStats[]),
    ticketTypeStats:
      ticketTypeStatsError || !ticketTypeStats
        ? []
        : (ticketTypeStats as OrganizerTicketTypeStats[]),
    entranceTimeStats:
      entranceTimeStatsError || !entranceTimeStats
        ? []
        : (entranceTimeStats as OrganizerEntranceTimeStats[]),
  };
}