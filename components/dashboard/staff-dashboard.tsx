import type { Profile } from "../../lib/auth/get-profile";

type StaffDashboardProps = {
  profile: Profile;
};

export function StaffDashboard({ profile }: StaffDashboardProps) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold">Staff Dashboard</h2>

      <p className="mt-2 text-gray-600">
        Welcome, {profile.full_name ?? profile.email}.
      </p>

      <div className="mt-6 rounded-md border border-dashed p-4">
        <h3 className="font-medium">Ticket validation</h3>
        <p className="mt-2 text-sm text-gray-600">
          Assigned events, QR scanner, and manual ticket validation will appear
          here in the QR validation layer.
        </p>
      </div>
    </section>
  );
}