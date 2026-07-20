import type { Profile } from "../../lib/auth/get-profile";
import type { OrganizerEventGroups } from "../../lib/events/get-organizer-events";
import type { EventStaffAssignment } from "../../lib/events/get-organizer-event-staff";
import type { StaffAssignedEvent } from "../../lib/staff/get-staff-events";
import type { TicketWithEvent } from "../../lib/tickets/get-ticket";
import { AdminDashboard } from "./admin-dashboard";
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
          pastEvents={organizerEventGroups.pastEvents}
          staffAssignments={organizerStaffAssignments}
          staffFeedback={staffFeedback}
        />
      );

    case "event_staff":
      return <StaffDashboard profile={profile} events={staffAssignedEvents} />;

    case "admin":
      return <AdminDashboard profile={profile} />;

    default:
      return (
        <section className="rounded-lg border border-red-300 bg-red-50 p-6 text-red-700">
          Unknown user role.
        </section>
      );
  }
}