import Link from "next/link";
import type { EventStaffAssignment } from "../../../lib/events/get-organizer-event-staff";
import type {
  EventWithCategory,
  OrganizerTab,
} from "./organizer-dashboard-types";
import {
  formatEventDate,
  getDashboardHref,
  getEventBadgeLabel,
  getStaffCount,
} from "./organizer-dashboard-utils";

type OrganizerEventSidebarProps = {
  events: EventWithCategory[];
  selectedEvent: EventWithCategory;
  selectedTab: OrganizerTab;
  staffAssignments: EventStaffAssignment[];
};

export function OrganizerEventSidebar({
  events,
  selectedEvent,
  selectedTab,
  staffAssignments,
}: OrganizerEventSidebarProps) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-4 px-2">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/35">
          Parties
        </p>

        <p className="mt-1 text-sm text-white/50">{events.length} events</p>
      </div>

      <div className="grid gap-2">
        {events.map((event) => {
          const isSelected = event.id === selectedEvent.id;
          const staffCount = getStaffCount(event.id, staffAssignments);

          if (!event.slug) {
            return null;
          }

          return (
            <Link
              key={event.id}
              href={getDashboardHref(event.slug, selectedTab)}
              className={
                isSelected
                  ? "rounded-2xl border border-white/30 bg-white/[0.08] p-4"
                  : "rounded-2xl border border-white/10 bg-transparent p-4 transition hover:bg-white/[0.04]"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">
                    {event.title}
                  </h3>

                  <p className="mt-1 text-xs text-white/45">
                    {formatEventDate(event.starts_at)}
                  </p>
                </div>

                <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/50">
                  {getEventBadgeLabel(event)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                <span>{event.status}</span>
                <span>·</span>
                <span>{event.max_tickets} capacity</span>
                <span>·</span>
                <span>{staffCount} staff</span>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}