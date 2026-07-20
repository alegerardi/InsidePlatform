import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicEventBySlug } from "../../../lib/events/get-event";

type PublicEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

async function getBaseUrl() {
  const headerStore = await headers();

  const host = headerStore.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  return `${protocol}://${host}`;
}

export default async function PublicEventPage({ params }: PublicEventPageProps) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const baseUrl = await getBaseUrl();
  const eventPath = `/events/${event.slug}`;
  const fullEventUrl = `${baseUrl}${eventPath}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-lg border p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Public event page
        </p>

        <h1 className="mt-3 text-4xl font-bold">{event.title}</h1>

        {event.description ? (
          <p className="mt-4 whitespace-pre-line text-gray-700">
            {event.description}
          </p>
        ) : null}

        <dl className="mt-8 grid gap-5 md:grid-cols-2">
          <div>
            <dt className="text-sm text-gray-500">Starts at</dt>
            <dd className="font-medium">{formatEventDate(event.starts_at)}</dd>
          </div>

          {event.ends_at ? (
            <div>
              <dt className="text-sm text-gray-500">Ends at</dt>
              <dd className="font-medium">{formatEventDate(event.ends_at)}</dd>
            </div>
          ) : null}

          <div>
            <dt className="text-sm text-gray-500">Location</dt>
            <dd className="font-medium">{event.location ?? "Not specified"}</dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Ticket capacity</dt>
            <dd className="font-medium">{event.max_tickets}</dd>
          </div>
        </dl>

        <div className="mt-8 rounded-md border border-dashed bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-500">
            Shareable event link
          </p>

          <p className="mt-2 break-all rounded-md bg-white p-3 font-mono text-sm">
            {fullEventUrl}
          </p>

          <p className="mt-2 text-sm text-gray-600">
            Copy this link and share it with clients. Anyone can open this public
            event page.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            disabled
            className="rounded-md bg-gray-300 px-5 py-3 font-medium text-gray-600"
          >
            Claim ticket — next layer
          </button>

          <Link href="/dashboard" className="rounded-md border px-5 py-3 font-medium">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}