import { createClient } from "../supabase/server";

export type TicketCapacityPool = "paid" | "guest_list";

export type OrganizerEventStats = {
  event_id: string;

  tickets_sold: number;
  paid_tickets_sold: number;
  guest_list_tickets_claimed: number;

  active_tickets: number;
  used_tickets: number;
  cancelled_tickets: number;

  gross_revenue_cents: number;

  successful_entrances: number;
  paid_successful_entrances: number;
  guest_list_successful_entrances: number;

  duplicate_scan_attempts: number;
  invalid_scan_attempts: number;

  event_remaining_capacity: number;
  paid_remaining_capacity: number;
  guest_list_remaining_capacity: number;

  page_views: number;
};

export type OrganizerTicketTypeStats = {
  event_id: string;
  ticket_type_id: string;
  ticket_type_title: string;
  price_cents: number;
  currency: string;
  max_quantity: number | null;
  capacity_pool: TicketCapacityPool;
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
  paid_successful_entrances: number;
  guest_list_successful_entrances: number;
};

export type OrganizerStatsData = {
  eventStats: OrganizerEventStats[];
  ticketTypeStats: OrganizerTicketTypeStats[];
  entranceTimeStats: OrganizerEntranceTimeStats[];
};

function logRpcError(label: string, error: unknown) {
  console.warn(label, {
    rawError: String(error),
    serializedError: JSON.stringify(error, null, 2),
    error,
  });
}

export async function getOrganizerStatsData(): Promise<OrganizerStatsData> {
  const supabase = await createClient();

  const [
    eventStatsResponse,
    ticketTypeStatsResponse,
    entranceTimeStatsResponse,
  ] = await Promise.all([
    supabase.rpc("get_my_organizer_event_stats"),
    supabase.rpc("get_my_organizer_ticket_type_stats"),
    supabase.rpc("get_my_organizer_entrance_time_stats"),
  ]);

  if (eventStatsResponse.error) {
    logRpcError(
      "getOrganizerStatsData event stats error",
      eventStatsResponse.error
    );
  }

  if (ticketTypeStatsResponse.error) {
    logRpcError(
      "getOrganizerStatsData ticket type stats error",
      ticketTypeStatsResponse.error
    );
  }

  if (entranceTimeStatsResponse.error) {
    logRpcError(
      "getOrganizerStatsData entrance time stats error",
      entranceTimeStatsResponse.error
    );
  }

  return {
    eventStats:
      eventStatsResponse.error || !eventStatsResponse.data
        ? []
        : (eventStatsResponse.data as OrganizerEventStats[]),
    ticketTypeStats:
      ticketTypeStatsResponse.error || !ticketTypeStatsResponse.data
        ? []
        : (ticketTypeStatsResponse.data as OrganizerTicketTypeStats[]),
    entranceTimeStats:
      entranceTimeStatsResponse.error || !entranceTimeStatsResponse.data
        ? []
        : (entranceTimeStatsResponse.data as OrganizerEntranceTimeStats[]),
  };
}