import type { EventStaffAssignment } from "../../../lib/events/get-organizer-event-staff";
import type { OrganizerEventGroups } from "../../../lib/events/get-organizer-events";
import type {
  EventWithCategory,
  OrganizerTab,
} from "./organizer-dashboard-types";

const VALID_TABS: OrganizerTab[] = ["overview", "staff", "links", "actions"];

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function normalizeTab(tab?: string): OrganizerTab {
  if (VALID_TABS.includes(tab as OrganizerTab)) {
    return tab as OrganizerTab;
  }

  return "overview";
}

export function getAllEvents(
  eventGroups: OrganizerEventGroups
): EventWithCategory[] {
  return [
    ...eventGroups.upcomingEvents.map((event) => ({
      ...event,
      category: "upcoming" as const,
    })),
    ...eventGroups.ongoingEvents.map((event) => ({
      ...event,
      category: "ongoing" as const,
    })),
    ...eventGroups.pastEvents.map((event) => ({
      ...event,
      category: "past" as const,
    })),
  ];
}

export function getStaffCount(
  eventId: string,
  staffAssignments: EventStaffAssignment[]
) {
  return staffAssignments.filter((assignment) => assignment.event_id === eventId)
    .length;
}

export function getEventStaff(
  eventId: string,
  staffAssignments: EventStaffAssignment[]
) {
  return staffAssignments.filter((assignment) => assignment.event_id === eventId);
}

export function getDashboardHref(eventSlug: string, tab: OrganizerTab) {
  return `/dashboard?event=${encodeURIComponent(eventSlug)}&tab=${tab}`;
}

export function getEventBadgeLabel(event: EventWithCategory) {
  if (event.status === "cancelled") {
    return "cancelled";
  }

  if (event.status === "completed") {
    return "completed";
  }

  return event.category;
}