import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketQrCode } from "../../../components/tickets/ticket-qr-code";
import { requireUser } from "../../../lib/auth/require-user";
import { getTicketById } from "../../../lib/tickets/get-ticket";
import { getBaseUrl } from "../../../lib/url/get-base-url";

type TicketPageProps = {
  params: Promise<{
    ticketId: string;
  }>;
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

export default async function TicketPage({ params }: TicketPageProps) {
  await requireUser("/dashboard");

  const { ticketId } = await params;
  const ticket = await getTicketById(ticketId);

  if (!ticket) {
    notFound();
  }

  const baseUrl = await getBaseUrl();
  const validationUrl = `${baseUrl}/validate/${ticket.qr_token}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-lg border p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Your ticket
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          {ticket.events?.title ?? "Event"}
        </h1>

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
          <section>
            <dl className="grid gap-5">
              <div>
                <dt className="text-sm text-gray-500">Ticket code</dt>
                <dd className="font-mono text-2xl font-semibold">
                  {ticket.ticket_code}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Ticket type</dt>
                <dd className="font-medium">
                  {ticket.ticket_type_title_snapshot ?? "General Admission"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Ticket price</dt>
                <dd className="font-medium">
                  {formatPrice(
                    ticket.ticket_price_cents_snapshot,
                    ticket.ticket_currency_snapshot
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="font-medium">{ticket.status}</dd>
              </div>

              {ticket.events?.starts_at ? (
                <div>
                  <dt className="text-sm text-gray-500">Event date</dt>
                  <dd className="font-medium">
                    {formatEventDate(ticket.events.starts_at)}
                  </dd>
                </div>
              ) : null}

              {ticket.events?.location ? (
                <div>
                  <dt className="text-sm text-gray-500">Location</dt>
                  <dd className="font-medium">{ticket.events.location}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="rounded-md bg-black px-5 py-3 font-medium text-white"
              >
                Go to dashboard
              </Link>

              {ticket.events?.slug ? (
                <Link
                  href={`/events/${ticket.events.slug}`}
                  className="rounded-md border px-5 py-3 font-medium"
                >
                  Back to event
                </Link>
              ) : null}
            </div>
          </section>

          <aside>
            <p className="mb-3 text-center text-sm font-medium text-gray-500">
              Show this QR code at the entrance
            </p>

            <TicketQrCode validationUrl={validationUrl} />

            <p className="mt-3 text-center text-xs text-gray-500">
              The QR contains a secure validation link for event staff.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}