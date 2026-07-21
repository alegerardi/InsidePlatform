import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyEventLinkButton } from "../../../components/events/copy-event-link-button";
import { ClaimTicketForm } from "../../../components/tickets/claim-ticket-form";
import { getUser } from "../../../lib/auth/get-user";
import {
  getPublicEventBySlug,
  getPublicTicketTypesForEvent,
} from "../../../lib/events/get-event";
import { recordEventPageView } from "../../../lib/events/record-event-page-view";
import { getUserTicketForEvent } from "../../../lib/tickets/get-user-ticket-for-event";
import { getBaseUrl } from "../../../lib/url/get-base-url";

type PublicEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PublicEventPage({
  params,
  searchParams,
}: PublicEventPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const [user, ticketTypes] = await Promise.all([
    getUser(),
    getPublicTicketTypesForEvent(event.id),
    recordEventPageView(event.id),
  ]);

  const existingTicket = user
    ? await getUserTicketForEvent(event.id, user.id)
    : null;

  const baseUrl = await getBaseUrl();
  const eventPath = `/events/${event.slug ?? slug}`;
  const fullEventUrl = `${baseUrl}${eventPath}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-lg border p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide opacity-60">
              Public event page
            </p>

            <h1 className="mt-3 text-4xl font-bold">{event.title}</h1>
          </div>

          <CopyEventLinkButton eventUrl={fullEventUrl} />
        </div>

        {event.description ? (
          <p className="mt-4 whitespace-pre-line opacity-80">
            {event.description}
          </p>
        ) : null}

        <dl className="mt-8 grid gap-5 md:grid-cols-2">
          <div>
            <dt className="text-sm opacity-60">Starts at</dt>
            <dd className="font-medium">{formatEventDate(event.starts_at)}</dd>
          </div>

          {event.ends_at ? (
            <div>
              <dt className="text-sm opacity-60">Ends at</dt>
              <dd className="font-medium">{formatEventDate(event.ends_at)}</dd>
            </div>
          ) : null}

          <div>
            <dt className="text-sm opacity-60">Location</dt>
            <dd className="font-medium">{event.location ?? "Not specified"}</dd>
          </div>
        </dl>

        {query?.message ? (
          <p className="mt-8 rounded-md border px-4 py-3 text-sm font-medium">
            {query.message}
          </p>
        ) : null}

        {query?.error ? (
          <p className="mt-8 rounded-md border px-4 py-3 text-sm font-medium">
            {query.error}
          </p>
        ) : null}

        <div className="mt-8">
          <ClaimTicketForm
            eventId={event.id}
            eventSlug={event.slug ?? slug}
            ticketTypes={ticketTypes}
            existingTicketId={existingTicket?.id}
          />
        </div>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex rounded-md border px-5 py-3 font-medium transition hover:opacity-80"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}