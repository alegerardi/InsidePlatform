import Link from "next/link";
import type { Profile } from "../../lib/auth/get-profile";

type AdminDashboardProps = {
  profile: Profile;
};

export function AdminDashboard({ profile }: AdminDashboardProps) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold">Admin Dashboard</h2>

      <p className="mt-2 text-gray-600">
        Welcome, {profile.full_name ?? profile.email}.
      </p>

      <div className="mt-6 rounded-md border border-dashed p-4">
        <h3 className="font-medium">Platform overview</h3>
        <p className="mt-2 text-sm text-gray-600">
          Global users, events, tickets, check-ins, and platform statistics will
          appear here in the admin statistics layer.
        </p>

        <Link
          href="/events/new"
          className="mt-4 inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Create event
        </Link>
      </div>
    </section>
  );
}