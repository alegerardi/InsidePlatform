import { requireUser } from "../../lib/auth/require-user";
import { getProfile } from "../../lib/auth/get-profile";

export default async function DashboardPage() {
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

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <p className="mt-2 text-gray-600">
        This is the protected dashboard placeholder for Layer 1.
      </p>

      <section className="mt-8 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Authenticated user</h2>

        <dl className="mt-4 grid gap-3">
          <div>
            <dt className="text-sm text-gray-500">Full name</dt>
            <dd className="font-medium">{profile.full_name ?? "Not provided"}</dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Email</dt>
            <dd className="font-medium">{profile.email}</dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Role</dt>
            <dd className="font-medium">{profile.role}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8 rounded-lg border border-dashed p-6">
        <h2 className="text-xl font-semibold">Next layer</h2>
        <p className="mt-2 text-gray-600">
          Later, this page will render ClientDashboard, OrganizerDashboard,
          StaffDashboard, or AdminDashboard depending on the user role.
        </p>
      </section>
    </main>
  );
}