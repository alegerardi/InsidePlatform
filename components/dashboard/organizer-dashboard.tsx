import type { Profile } from "../../lib/auth/get-profile";

type OrganizerDashboardProps = {
  profile: Profile;
};

export function OrganizerDashboard({ profile }: OrganizerDashboardProps) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold">Organizer Dashboard</h2>

      <p className="mt-2 text-gray-600">
        Welcome, {profile.full_name ?? profile.email}.
      </p>

      <div className="mt-6 rounded-md border border-dashed p-4">
        <h3 className="font-medium">Your events</h3>
        <p className="mt-2 text-sm text-gray-600">
          Event management and organizer statistics will appear here in the
          events/statistics layers.
        </p>
      </div>
    </section>
  );
}