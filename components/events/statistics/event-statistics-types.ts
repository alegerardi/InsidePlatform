import type { StatsEvent } from "../../../lib/events/get-event-for-stats";
import type {
  OrganizerEntranceTimeStats,
  OrganizerEventStats,
  OrganizerTicketTypeStats,
} from "../../../lib/events/get-organizer-event-stats";

export type EventCategory = "upcoming" | "ongoing" | "past";

export type EventStatisticsViewProps = {
  event: StatsEvent;
  category: EventCategory;
  eventStats?: OrganizerEventStats;
  ticketTypeStats: OrganizerTicketTypeStats[];
  entranceTimeStats: OrganizerEntranceTimeStats[];
};