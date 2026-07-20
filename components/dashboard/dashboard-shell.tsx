import type { Profile } from "../../lib/auth/get-profile";
import type { OrganizerEvent } from "../../lib/events/get-organizer-events";
import { AdminDashboard } from "./admin-dashboard";
import { ClientDashboard } from "./client-dashboard";
import { OrganizerDashboard } from "./organizer-dashboard";
import { StaffDashboard } from "./staff-dashboard";

type DashboardShellProps = {
  profile: Profile;
  organizerEvents?: OrganizerEvent[];
};

export function DashboardShell({
  profile,
  organizerEvents = [],
}: DashboardShellProps) {
  switch (profile.role) {
    case "client":
      return <ClientDashboard profile={profile} />;

    case "event_organizer":
      return (
        <OrganizerDashboard profile={profile} events={organizerEvents} />
      );

    case "event_staff":
      return <StaffDashboard profile={profile} />;

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