import Link from "next/link";
import type { Profile } from "../../lib/auth/get-profile";
import type { OrganizerEvent } from "../../lib/events/get-organizer-events";

type OrganizerDashboardProps = {
  profile: Profile;
  events: OrganizerEvent[];
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function EventCard({ event }: { event: OrganizerEvent }) {
  const publicPath = event.slug ? `/events/${event.slug}` : null;

  return (
    <article className="rounded-lg border p-4">
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

            <span className="rounded-full border px-2 py-1 text-xs">
              {event.max_tickets} tickets
            </span>

            <span className="rounded-full border px-2 py-1 text-xs">
              {event.max_guest_list} guest-list
            </span>
          </div>
        </div>

        {publicPath ? (
          <Link
            href={publicPath}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Open public page
          </Link>
        ) : (
          <span className="text-sm text-gray-500">No public link</span>
        )}
      </div>

      {publicPath ? (
        <p className="mt-4 break-all rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-700">
          {publicPath}
        </p>
      ) : null}
    </article>
  );
}

export function OrganizerDashboard({
  profile,
  events,
}: OrganizerDashboardProps) {
  const now = Date.now();

  const upcomingEvents = events.filter((event) => {
    const startsAt = new Date(event.starts_at).getTime();

    return (
      startsAt >= now &&
      event.status !== "completed" &&
      event.status !== "cancelled"
    );
  });

  const pastEvents = events.filter((event) => {
    const startsAt = new Date(event.starts_at).getTime();

    return (
      startsAt < now ||
      event.status === "completed" ||
      event.status === "cancelled"
    );
  });

  return (
    <section className="rounded-lg border p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Organizer Dashboard</h2>

          <p className="mt-2 text-gray-600">
            Welcome, {profile.full_name ?? profile.email}.
          </p>
        </div>

        <Link
          href="/events/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Create event
        </Link>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Upcoming events</h3>

        {upcomingEvents.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-gray-600">
            No upcoming events yet.
          </div>
        )}
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-semibold">Past events</h3>

        {pastEvents.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-gray-600">
            No past events yet.
          </div>
        )}
      </div>
    </section>
  );
}