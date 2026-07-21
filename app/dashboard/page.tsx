import { redirect } from "next/navigation";
import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { getProfile } from "../../lib/auth/get-profile";
import { requireUser } from "../../lib/auth/require-user";
import { getOrganizerEventStaffAssignments } from "../../lib/events/get-organizer-event-staff";
import { getOrganizerEventGroups } from "../../lib/events/get-organizer-events";
import { getStaffAssignedEvents } from "../../lib/staff/get-staff-events";
import { getClientTickets } from "../../lib/tickets/get-client-tickets";
import { getBaseUrl } from "../../lib/url/get-base-url";

type DashboardPageProps = {
  searchParams?: Promise<{
    event?: string;
    tab?: string;
    message?: string;
    error?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await requireUser("/dashboard");
  const profile = await getProfile(user.id);
  const query = await searchParams;

  if (!profile) {
    redirect("/login");
  }

  const isOrganizer =
    profile.role === "event_organizer" || profile.role === "admin";

  const [
    organizerEventGroups,
    organizerStaffAssignments,
    clientTickets,
    staffAssignedEvents,
    baseUrl,
  ] = await Promise.all([
    isOrganizer
      ? getOrganizerEventGroups(profile.id)
      : Promise.resolve({
          upcomingEvents: [],
          ongoingEvents: [],
          pastEvents: [],
        }),
    isOrganizer ? getOrganizerEventStaffAssignments() : Promise.resolve([]),
    profile.role === "client" ? getClientTickets(profile.id) : Promise.resolve([]),
    profile.role === "event_staff" ? getStaffAssignedEvents() : Promise.resolve([]),
    isOrganizer ? getBaseUrl() : Promise.resolve(""),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <DashboardShell
        profile={profile}
        organizerEventGroups={organizerEventGroups}
        organizerStaffAssignments={organizerStaffAssignments}
        organizerSelectedEventSlug={query?.event}
        organizerSelectedTab={query?.tab}
        organizerFeedback={{
          message: query?.message,
          error: query?.error,
        }}
        organizerBaseUrl={baseUrl}
        clientTickets={clientTickets}
        staffAssignedEvents={staffAssignedEvents}
      />
    </main>
  );
}