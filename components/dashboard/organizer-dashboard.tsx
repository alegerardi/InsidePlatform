import Link from "next/link";
import { addEventStaffAction } from "../../lib/actions/event-staff";
import type { Profile } from "../../lib/auth/get-profile";
import type { EventStaffAssignment } from "../../lib/events/get-organizer-event-staff";
import type {
  OrganizerEvent,
  OrganizerEventGroups,
} from "../../lib/events/get-organizer-events";
import { CopyEventLinkButton } from "../events/copy-event-link-button";
import { CancelEventCard } from "../events/cancel-event-card";
import { RemoveStaffButton } from "../events/remove-staff-button";

type EventCategory = "upcoming" | "ongoing" | "past";
type OrganizerTab = "overview" | "staff" | "links" | "actions";

type OrganizerFeedback = {
  message?: string;
  error?: string;
};

type OrganizerDashboardProps = {
  profile: Profile;
  eventGroups: OrganizerEventGroups;
  staffAssignments: EventStaffAssignment[];
  selectedEventSlug?: string;
  selectedTab?: string;
  feedback?: OrganizerFeedback;
  baseUrl: string;
};

type EventWithCategory = OrganizerEvent & {
  category: EventCategory;
};

const VALID_TABS: OrganizerTab[] = ["overview", "staff", "links", "actions"];

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeTab(tab?: string): OrganizerTab {
  if (VALID_TABS.includes(tab as OrganizerTab)) {
    return tab as OrganizerTab;
  }

  return "overview";
}

function getAllEvents(eventGroups: OrganizerEventGroups): EventWithCategory[] {
  return [
    ...eventGroups.upcomingEvents.map((event) => ({
      ...event,
      category: "upcoming" as const,
    })),
    ...eventGroups.ongoingEvents.map((event) => ({
      ...event,
      category: "ongoing" as const,
    })),
    ...eventGroups.pastEvents.map((event) => ({
      ...event,
      category: "past" as const,
    })),
  ];
}

function getStaffCount(eventId: string, staffAssignments: EventStaffAssignment[]) {
  return staffAssignments.filter((assignment) => assignment.event_id === eventId)
    .length;
}

function getEventStaff(eventId: string, staffAssignments: EventStaffAssignment[]) {
  return staffAssignments.filter((assignment) => assignment.event_id === eventId);
}

function getDashboardHref(eventSlug: string, tab: OrganizerTab) {
  return `/dashboard?event=${encodeURIComponent(eventSlug)}&tab=${tab}`;
}

function EventSelector({
  events,
  selectedEvent,
  selectedTab,
  staffAssignments,
}: {
  events: EventWithCategory[];
  selectedEvent: EventWithCategory;
  selectedTab: OrganizerTab;
  staffAssignments: EventStaffAssignment[];
}) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-4 px-2">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/35">
          Parties
        </p>

        <p className="mt-1 text-sm text-white/50">{events.length} events</p>
      </div>

      <div className="grid gap-2">
        {events.map((event) => {
          const isSelected = event.id === selectedEvent.id;
          const staffCount = getStaffCount(event.id, staffAssignments);

          if (!event.slug) {
            return null;
          }

          return (
            <Link
              key={event.id}
              href={getDashboardHref(event.slug, selectedTab)}
              className={
                isSelected
                  ? "rounded-2xl border border-white/30 bg-white/[0.08] p-4"
                  : "rounded-2xl border border-white/10 bg-transparent p-4 transition hover:bg-white/[0.04]"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">
                    {event.title}
                  </h3>

                  <p className="mt-1 text-xs text-white/45">
                    {formatEventDate(event.starts_at)}
                  </p>
                </div>

                <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/50">
                  {getEventBadgeLabel(event)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                <span>{event.status}</span>
                <span>·</span>
                <span>{event.max_tickets} capacity</span>
                <span>·</span>
                <span>{staffCount} staff</span>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

function DashboardTabs({
  eventSlug,
  selectedTab,
}: {
  eventSlug: string;
  selectedTab: OrganizerTab;
}) {
  const tabs: {
    value: OrganizerTab;
    label: string;
  }[] = [
    { value: "overview", label: "Overview" },
    { value: "staff", label: "Staff" },
    { value: "links", label: "Links" },
    { value: "actions", label: "Actions" },
  ];

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isSelected = tab.value === selectedTab;

        return (
          <Link
            key={tab.value}
            href={getDashboardHref(eventSlug, tab.value)}
            className={
              isSelected
                ? "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                : "rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function OverviewTab({
  event,
  staffCount,
}: {
  event: EventWithCategory;
  staffCount: number;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
            Date
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-white">
            {formatEventDate(event.starts_at)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
            Location
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-white">
            {event.location ?? "No location"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
            Capacity
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-white">
            {event.max_tickets} paid · {event.max_guest_list} guest list
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
          Status
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70">
            {event.status}
          </span>

          <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70">
            {event.category}
          </span>

          <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70">
            {staffCount} staff
          </span>
        </div>
      </div>
    </div>
  );
}

function StaffTab({
  event,
  staffAssignments,
  feedback,
}: {
  event: EventWithCategory;
  staffAssignments: EventStaffAssignment[];
  feedback?: OrganizerFeedback;
}) {
  const eventStaff = getEventStaff(event.id, staffAssignments);
  const redirectPath = event.slug
    ? getDashboardHref(event.slug, "staff")
    : "/dashboard";

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Assigned staff</h3>
            <p className="mt-1 text-sm text-white/45">
              Users allowed to validate tickets for this event.
            </p>
          </div>

          <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/60">
            {eventStaff.length}
          </span>
        </div>

        {eventStaff.length > 0 ? (
          <div className="mt-5 grid gap-2">
            {eventStaff.map((assignment) => (
              <div
                key={`${assignment.event_id}-${assignment.staff_user_id}`}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{assignment.staff_email}</p>
                  <p className="mt-1 text-xs text-white/35">Can validate this event</p>
                </div>

                <RemoveStaffButton
                  eventId={event.id}
                  staffUserId={assignment.staff_user_id}
                  staffEmail={assignment.staff_email}
                  redirectPath={redirectPath}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/45">
            No staff assigned yet.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-lg font-semibold text-white">Add staff</h3>

        <form
          action={addEventStaffAction}
          className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"
        >
          <input type="hidden" name="event_id" value={event.id} />
          <input type="hidden" name="redirect_path" value={redirectPath} />

          <input
            name="staff_email"
            type="email"
            required
            placeholder="staff@example.com"
            className="rounded-xl border border-white/15 bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
          />

          <button
            type="submit"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
          >
            Add staff
          </button>
        </form>

        {feedback?.message ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            {feedback.message}
          </p>
        ) : null}

        {feedback?.error ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            {feedback.error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function LinksTab({
  event,
  baseUrl,
}: {
  event: EventWithCategory;
  baseUrl: string;
}) {
  if (!event.slug) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
        This event does not have a public link.
      </div>
    );
  }

  const eventUrl = `${baseUrl}/events/${event.slug}`;

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-lg font-semibold text-white">Public event link</h3>

        <p className="mt-2 break-all rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-white/60">
          {eventUrl}
        </p>

        <div className="mt-5">
          <CopyEventLinkButton eventUrl={eventUrl} />
        </div>
      </section>
    </div>
  );
}

function ActionsTab({
  event,
  feedback,
}: {
  event: EventWithCategory;
  feedback?: OrganizerFeedback;
}) {
  const isPublic = event.status === "published" || event.status === "active";
  const publicPath = isPublic && event.slug ? `/events/${event.slug}` : null;
  const statsPath = event.slug ? `/events/${event.slug}/stats` : null;
  const editPath = event.slug ? `/events/${event.slug}/edit` : null;
  const canEdit =
    event.category === "upcoming" &&
    event.status !== "cancelled" &&
    event.status !== "completed";

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {publicPath ? (
          <Link
            href={publicPath}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
          >
            <p className="font-semibold text-white">Open public page</p>
            <p className="mt-2 text-sm text-white/45">
              View the client-facing page.
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="font-semibold text-white">Public page hidden</p>
            <p className="mt-2 text-sm text-white/45">
              This event is not visible to clients.
            </p>
          </div>
        )}

        {statsPath ? (
          <Link
            href={statsPath}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
          >
            <p className="font-semibold text-white">Statistics</p>
            <p className="mt-2 text-sm text-white/45">
              See sales, guest list, views, and entrances.
            </p>
          </Link>
        ) : null}

        {canEdit && editPath ? (
          <Link
            href={editPath}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
          >
            <p className="font-semibold text-white">Edit event</p>
            <p className="mt-2 text-sm text-white/45">
              Update event details and ticket types.
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="font-semibold text-white">Editing locked</p>
            <p className="mt-2 text-sm text-white/45">
              Only upcoming events can be edited.
            </p>
          </div>
        )}
      </div>

      <CancelEventCard
        eventId={event.id}
        eventSlug={event.slug}
        status={event.status}
        category={event.category}
        feedback={feedback}
      />
    </div>
  );
}

function getEventBadgeLabel(event: EventWithCategory) {
  if (event.status === "cancelled") {
    return "cancelled";
  }

  if (event.status === "completed") {
    return "completed";
  }

  return event.category;
}

function SelectedEventPanel({
  event,
  selectedTab,
  staffAssignments,
  feedback,
  baseUrl,
}: {
  event: EventWithCategory;
  selectedTab: OrganizerTab;
  staffAssignments: EventStaffAssignment[];
  feedback?: OrganizerFeedback;
  baseUrl: string;
}) {
  const staffCount = getStaffCount(event.id, staffAssignments);

  if (!event.slug) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        This event is missing a slug.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/35">
            Selected party
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
            {event.title}
          </h2>

          <p className="mt-2 text-sm text-white/45">
            {formatEventDate(event.starts_at)}
          </p>
        </div>

        <DashboardTabs eventSlug={event.slug} selectedTab={selectedTab} />
      </div>

      <div className="mt-6">
        {selectedTab === "overview" ? (
          <OverviewTab event={event} staffCount={staffCount} />
        ) : null}

        {selectedTab === "staff" ? (
          <StaffTab
            event={event}
            staffAssignments={staffAssignments}
            feedback={feedback}
          />
        ) : null}

        {selectedTab === "links" ? (
          <LinksTab event={event} baseUrl={baseUrl} />
        ) : null}

        {selectedTab === "actions" ? (
          <ActionsTab event={event} feedback={feedback} />
        ) : null}
      </div>
    </section>
  );
}

export function OrganizerDashboard({
  profile,
  eventGroups,
  staffAssignments,
  selectedEventSlug,
  selectedTab,
  feedback,
  baseUrl,
}: OrganizerDashboardProps) {
  const allEvents = getAllEvents(eventGroups);
  const activeTab = normalizeTab(selectedTab);

  const selectedEvent =
    allEvents.find((event) => event.slug === selectedEventSlug) ??
    allEvents.find((event) => event.slug) ??
    null;

  if (!selectedEvent) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-6 p-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/40">
              Organizer
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Dashboard
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Welcome, {profile.full_name ?? profile.email}.
            </p>
          </div>

          <Link
            href="/events/new"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
          >
            Create event
          </Link>
        </div>

        <div className="border-t border-white/10 p-8">
          <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/45">
            No events yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-6 border-b border-white/10 p-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/40">
            Organizer
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-white/50">
            Welcome, {profile.full_name ?? profile.email}.
          </p>
        </div>

        <Link
          href="/events/new"
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
        >
          Create event
        </Link>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
        <EventSelector
          events={allEvents}
          selectedEvent={selectedEvent}
          selectedTab={activeTab}
          staffAssignments={staffAssignments}
        />

        <SelectedEventPanel
          event={selectedEvent}
          selectedTab={activeTab}
          staffAssignments={staffAssignments}
          feedback={feedback}
          baseUrl={baseUrl}
        />
      </div>
    </section>
  );
}