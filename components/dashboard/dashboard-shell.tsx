import type { Profile } from "../../lib/auth/get-profile";
import type { EventStaffAssignment } from "../../lib/events/get-organizer-event-staff";
import type { OrganizerEventGroups } from "../../lib/events/get-organizer-events";
import type { StaffAssignedEvent } from "../../lib/staff/get-staff-events";
import type { TicketWithEvent } from "../../lib/tickets/get-ticket";
import { ClientDashboard } from "./client-dashboard";
import { OrganizerDashboard } from "./organizer-dashboard";
import { StaffDashboard } from "./staff-dashboard";

type StaffFeedback = {
  eventId?: string;
  message?: string;
  error?: string;
};

type DashboardShellProps = {
  profile: Profile;
  organizerEventGroups: OrganizerEventGroups;
  organizerStaffAssignments?: EventStaffAssignment[];
  staffFeedback?: StaffFeedback;
  clientTickets?: TicketWithEvent[];
  staffAssignedEvents?: StaffAssignedEvent[];
};

export function DashboardShell({
  profile,
  organizerEventGroups,
  organizerStaffAssignments = [],
  staffFeedback,
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
          upcomingEvents={organizerEventGroups.upcomingEvents}
          ongoingEvents={organizerEventGroups.ongoingEvents}
          pastEvents={organizerEventGroups.pastEvents}
          staffAssignments={organizerStaffAssignments}
          staffFeedback={staffFeedback}
        />
      );

    case "event_staff":
      return <StaffDashboard profile={profile} events={staffAssignedEvents} />;

    case "admin":
      return (
        <OrganizerDashboard
          profile={profile}
          upcomingEvents={organizerEventGroups.upcomingEvents}
          ongoingEvents={organizerEventGroups.ongoingEvents}
          pastEvents={organizerEventGroups.pastEvents}
          staffAssignments={organizerStaffAssignments}
          staffFeedback={staffFeedback}
        />
      );

    default:
      return (
        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Unknown role</h2>
          <p className="mt-2 text-gray-600">
            Your profile role is not recognized.
          </p>
        </section>
      );
  }
}