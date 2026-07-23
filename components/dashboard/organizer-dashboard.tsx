import Link from "next/link";
import type { Profile } from "../../lib/auth/get-profile";
import type { EventStaffAssignment } from "../../lib/events/get-organizer-event-staff";
import type { OrganizerEventGroups } from "../../lib/events/get-organizer-events";
import { OrganizerEventSidebar } from "./organizer/organizer-event-sidebar";
import { OrganizerSelectedEventPanel } from "./organizer/organizer-selected-event-panel";
import type { OrganizerFeedback } from "./organizer/organizer-dashboard-types";
import {
  getAllEvents,
  normalizeTab,
} from "./organizer/organizer-dashboard-utils";

type OrganizerDashboardProps = {
  profile: Profile;
  eventGroups: OrganizerEventGroups;
  staffAssignments: EventStaffAssignment[];
  selectedEventSlug?: string;
  selectedTab?: string;
  feedback?: OrganizerFeedback;
  baseUrl: string;
};

export function OrganizerDashboard({
  profile,
  eventGroups,
  staffAssignments,
  selectedEventSlug,
  selectedTab,
  feedback,
  baseUrl,
}: OrganizerDashboardProps) {
  const allEvents = getAllEvents(eventGroups);
  const activeTab = normalizeTab(selectedTab);

  const selectedEvent =
    allEvents.find((event) => event.slug === selectedEventSlug) ??
    allEvents.find((event) => event.slug) ??
    null;

  if (!selectedEvent) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-6 p-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/40">
              Organizer
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Dashboard
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Welcome, {profile.full_name ?? profile.email}.
            </p>
          </div>

          <Link
            href="/events/new"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
          >
            Create event
          </Link>
        </div>

        <div className="border-t border-white/10 p-8">
          <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/45">
            No events yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-6 border-b border-white/10 p-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/40">
            Organizer
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-white/50">
            Welcome, {profile.full_name ?? profile.email}.
          </p>
        </div>

        <Link
          href="/events/new"
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
        >
          Create event
        </Link>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
        <OrganizerEventSidebar
          events={allEvents}
          selectedEvent={selectedEvent}
          selectedTab={activeTab}
          staffAssignments={staffAssignments}
        />

        <OrganizerSelectedEventPanel
          event={selectedEvent}
          selectedTab={activeTab}
          staffAssignments={staffAssignments}
          feedback={feedback}
          baseUrl={baseUrl}
        />
      </div>
    </section>
  );
}