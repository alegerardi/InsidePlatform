import Link from "next/link";
import { addEventStaffAction } from "../../lib/actions/event-staff";
import type { Profile } from "../../lib/auth/get-profile";
import type { EventStaffAssignment } from "../../lib/events/get-organizer-event-staff";
import type { OrganizerEvent } from "../../lib/events/get-organizer-events";

type EventCategory = "upcoming" | "ongoing" | "past";

type StaffFeedback = {
  eventId?: string;
  message?: string;
  error?: string;
};

type OrganizerDashboardProps = {
  profile: Profile;
  upcomingEvents: OrganizerEvent[];
  ongoingEvents: OrganizerEvent[];
  pastEvents: OrganizerEvent[];
  staffAssignments: EventStaffAssignment[];
  staffFeedback?: StaffFeedback;
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function EventCard({
  event,
  category,
  staffAssignments,
  staffFeedback,
  canEdit,
}: {
  event: OrganizerEvent;
  category: EventCategory;
  staffAssignments: EventStaffAssignment[];
  staffFeedback?: StaffFeedback;
  canEdit: boolean;
}) {
  const publicPath = event.slug ? `/events/${event.slug}` : null;
  const editPath = event.slug ? `/events/${event.slug}/edit` : null;
  const statsPath = event.slug ? `/events/${event.slug}/stats` : null;

  const eventStaff = staffAssignments.filter(
    (assignment) => assignment.event_id === event.id
  );

  const showFeedback = staffFeedback?.eventId === event.id;

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
              {event.max_tickets} capacity
            </span>

            <span className="rounded-full border px-2 py-1 text-xs">
              {category}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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

          {statsPath ? (
            <Link
              href={statsPath}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Statistics
            </Link>
          ) : null}

          {canEdit && editPath ? (
            <Link
              href={editPath}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Edit event
            </Link>
          ) : null}
        </div>
      </div>

      {publicPath ? (
        <p className="mt-4 break-all rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-700">
          {publicPath}
        </p>
      ) : null}

      <div className="mt-5 rounded-md border border-dashed p-4">
        <h5 className="font-medium">Event staff</h5>

        {eventStaff.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {eventStaff.map((assignment) => (
              <p
                key={`${assignment.event_id}-${assignment.staff_user_id}`}
                className="text-sm text-gray-700"
              >
                Staff added:{" "}
                <span className="font-medium">{assignment.staff_email}</span>
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-600">No staff assigned yet.</p>
        )}

        <form
          action={addEventStaffAction}
          className="mt-4 flex flex-col gap-3 md:flex-row"
        >
          <input type="hidden" name="event_id" value={event.id} />

          <input
            name="staff_email"
            type="email"
            required
            placeholder="event.staff@example.com"
            className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
          />

          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Add staff for this event
          </button>
        </form>

        {showFeedback && staffFeedback?.message ? (
          <p className="mt-3 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
            {staffFeedback.message}
          </p>
        ) : null}

        {showFeedback && staffFeedback?.error ? (
          <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {staffFeedback.error}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function EventSection({
  title,
  emptyMessage,
  events,
  category,
  canEdit,
  staffAssignments,
  staffFeedback,
}: {
  title: string;
  emptyMessage: string;
  events: OrganizerEvent[];
  category: EventCategory;
  canEdit: boolean;
  staffAssignments: EventStaffAssignment[];
  staffFeedback?: StaffFeedback;
}) {
  return (
    <div className="mt-10">
      <h3 className="text-lg font-semibold">{title}</h3>

      {events.length > 0 ? (
        <div className="mt-4 grid gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              category={category}
              staffAssignments={staffAssignments}
              staffFeedback={staffFeedback}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-gray-600">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

export function OrganizerDashboard({
  profile,
  upcomingEvents,
  ongoingEvents,
  pastEvents,
  staffAssignments,
  staffFeedback,
}: OrganizerDashboardProps) {
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

      <EventSection
        title="Upcoming events"
        emptyMessage="No upcoming events yet."
        events={upcomingEvents}
        category="upcoming"
        canEdit={true}
        staffAssignments={staffAssignments}
        staffFeedback={staffFeedback}
      />

      <EventSection
        title="Ongoing events"
        emptyMessage="No ongoing events right now."
        events={ongoingEvents}
        category="ongoing"
        canEdit={false}
        staffAssignments={staffAssignments}
        staffFeedback={staffFeedback}
      />

      <EventSection
        title="Past events"
        emptyMessage="No past events yet."
        events={pastEvents}
        category="past"
        canEdit={false}
        staffAssignments={staffAssignments}
        staffFeedback={staffFeedback}
      />
    </section>
  );
}