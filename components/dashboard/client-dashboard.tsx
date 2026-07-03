import type { Profile } from "../../lib/auth/get-profile";

type ClientDashboardProps = {
  profile: Profile;
};

export function ClientDashboard({ profile }: ClientDashboardProps) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold">Client Dashboard</h2>

      <p className="mt-2 text-gray-600">
        Welcome, {profile.full_name ?? profile.email}.
      </p>

      <div className="mt-6 rounded-md border border-dashed p-4">
        <h3 className="font-medium">Your tickets</h3>
        <p className="mt-2 text-sm text-gray-600">
          Ticket list and QR codes will appear here in the ticket layer.
        </p>
      </div>
    </section>
  );
}