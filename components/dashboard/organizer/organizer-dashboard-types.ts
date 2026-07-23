import type { OrganizerEvent } from "../../../lib/events/get-organizer-events";

export type EventCategory = "upcoming" | "ongoing" | "past";
export type OrganizerTab = "overview" | "staff" | "links" | "actions";

export type OrganizerFeedback = {
  message?: string;
  error?: string;
};

export type EventWithCategory = OrganizerEvent & {
  category: EventCategory;
};