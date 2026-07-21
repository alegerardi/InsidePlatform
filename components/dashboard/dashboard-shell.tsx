import type { Profile } from "../../lib/auth/get-profile";
import type { EventStaffAssignment } from "../../lib/events/get-organizer-event-staff";
import type { OrganizerEventGroups } from "../../lib/events/get-organizer-events";
import type { StaffAssignedEvent } from "../../lib/staff/get-staff-events";
import type { TicketWithEvent } from "../../lib/tickets/get-ticket";
import { ClientDashboard } from "./client-dashboard";
import { OrganizerDashboard } from "./organizer-dashboard";
import { StaffDashboard } from "./staff-dashboard";

type OrganizerFeedback = {
  message?: string;
  error?: string;
};

type DashboardShellProps = {
  profile: Profile;
  organizerEventGroups: OrganizerEventGroups;
  organizerStaffAssignments?: EventStaffAssignment[];
  organizerSelectedEventSlug?: string;
  organizerSelectedTab?: string;
  organizerFeedback?: OrganizerFeedback;
  organizerBaseUrl?: string;
  clientTickets?: TicketWithEvent[];
  staffAssignedEvents?: StaffAssignedEvent[];
};

export function DashboardShell({
  profile,
  organizerEventGroups,
  organizerStaffAssignments = [],
  organizerSelectedEventSlug,
  organizerSelectedTab,
  organizerFeedback,
  organizerBaseUrl = "",
  clientTickets = [],
  staffAssignedEvents = [],
}: DashboardShellProps) {
  switch (profile.role) {
    case "client":
      return <ClientDashboard profile={profile} tickets={clientTickets} />;

    case "event_organizer":
      return (
        <OrganizerDashboard
          profile={profile}
          eventGroups={organizerEventGroups}
          staffAssignments={organizerStaffAssignments}
          selectedEventSlug={organizerSelectedEventSlug}
          selectedTab={organizerSelectedTab}
          feedback={organizerFeedback}
          baseUrl={organizerBaseUrl}
        />
      );

    case "event_staff":
      return <StaffDashboard profile={profile} events={staffAssignedEvents} />;

    case "admin":
      return (
        <OrganizerDashboard
          profile={profile}
          eventGroups={organizerEventGroups}
          staffAssignments={organizerStaffAssignments}
          selectedEventSlug={organizerSelectedEventSlug}
          selectedTab={organizerSelectedTab}
          feedback={organizerFeedback}
          baseUrl={organizerBaseUrl}
        />
      );

    default:
      return (
        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Unknown role</h2>
          <p className="mt-2 opacity-70">
            Your profile role is not recognized.
          </p>
        </section>
      );
  }
}