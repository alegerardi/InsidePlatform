import Link from "next/link";
import { CancelEventCard } from "../../events/cancel-event-card";
import type {
  EventWithCategory,
  OrganizerFeedback,
} from "./organizer-dashboard-types";

type OrganizerActionsPanelProps = {
  event: EventWithCategory;
  feedback?: OrganizerFeedback;
};

export function OrganizerActionsPanel({
  event,
  feedback,
}: OrganizerActionsPanelProps) {
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