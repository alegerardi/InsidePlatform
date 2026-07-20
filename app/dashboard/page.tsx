import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { getProfile } from "../../lib/auth/get-profile";
import { requireUser } from "../../lib/auth/require-user";
import {
  getOrganizerEventGroups,
  type OrganizerEventGroups,
} from "../../lib/events/get-organizer-events";
import { getOrganizerEventStaffAssignments } from "../../lib/events/get-organizer-event-staff";
import { getClientTickets } from "../../lib/tickets/get-client-tickets";
import { getStaffAssignedEvents } from "../../lib/staff/get-staff-events";

const emptyOrganizerEventGroups: OrganizerEventGroups = {
  upcomingEvents: [],
  pastEvents: [],
};

type DashboardPageProps = {
  searchParams?: Promise<{
    staffEventId?: string;
    staffMessage?: string;
    staffError?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const query = await searchParams;

  const user = await requireUser("/dashboard");
  const profile = await getProfile(user.id);

  if (!profile) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-red-700">
          Profile not found. Try logging out and signing in again.
        </div>
      </main>
    );
  }

  const organizerEventGroups =
    profile.role === "event_organizer"
      ? await getOrganizerEventGroups(profile.id)
      : emptyOrganizerEventGroups;

  const organizerStaffAssignments =
    profile.role === "event_organizer"
      ? await getOrganizerEventStaffAssignments()
      : [];

  const clientTickets =
    profile.role === "client" ? await getClientTickets(profile.id) : [];

  const staffAssignedEvents =
  profile.role === "event_staff" ? await getStaffAssignedEvents() : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-600">Role-aware dashboard container.</p>
      </div>

      <section className="mb-8 rounded-lg border bg-gray-50 p-4">
        <p className="text-sm text-gray-500">Current role</p>
        <p className="font-semibold">{profile.role}</p>
      </section>

      <DashboardShell
        profile={profile}
        organizerEventGroups={organizerEventGroups}
        organizerStaffAssignments={organizerStaffAssignments}
        staffFeedback={{
          eventId: query?.staffEventId,
          message: query?.staffMessage,
          error: query?.staffError,
        }}
        clientTickets={clientTickets}
        staffAssignedEvents={staffAssignedEvents}
      />
    </main>
  );
}