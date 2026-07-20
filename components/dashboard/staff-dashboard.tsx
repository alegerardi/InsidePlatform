import Link from "next/link";
import type { Profile } from "../../lib/auth/get-profile";
import type { StaffAssignedEvent } from "../../lib/staff/get-staff-events";

type StaffDashboardProps = {
  profile: Profile;
  events: StaffAssignedEvent[];
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StaffDashboard({ profile, events }: StaffDashboardProps) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold">Staff Dashboard</h2>

      <p className="mt-2 text-gray-600">
        Welcome, {profile.full_name ?? profile.email}.
      </p>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Assigned events</h3>

        {events.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {events.map((event) => (
              <article key={event.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="font-semibold">{event.title}</h4>

                    <p className="mt-1 text-sm text-gray-600">
                      {formatEventDate(event.starts_at)}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {event.location ?? "No location"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border px-2 py-1 text-xs">
                        {event.status}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/staff/events/${event.id}/validate`}
                    className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
                  >
                    Open validation mode
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-gray-600">
            You are not assigned to any events yet.
          </div>
        )}
      </div>
    </section>
  );
}