import Link from "next/link";
import type { Profile } from "../../lib/auth/get-profile";
import type { TicketWithEvent } from "../../lib/tickets/get-ticket";

type ClientDashboardProps = {
  profile: Profile;
  tickets: TicketWithEvent[];
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

function TicketCard({ ticket }: { ticket: TicketWithEvent }) {
  const event = ticket.events;
  const ticketType = ticket.ticket_type_title_snapshot ?? "General Admission";
  const ticketPrice = formatPrice(
    ticket.ticket_price_cents_snapshot,
    ticket.ticket_currency_snapshot
  );

  return (
    <article className="rounded-lg border p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="font-semibold">{event?.title ?? "Event"}</h4>

          {event?.starts_at ? (
            <p className="mt-1 text-sm text-gray-600">
              {formatEventDate(event.starts_at)}
            </p>
          ) : null}

          {event?.location ? (
            <p className="mt-1 text-sm text-gray-600">{event.location}</p>
          ) : null}

          <div className="mt-4 grid gap-2 text-sm">
            <p>
              <span className="text-gray-500">Ticket type:</span>{" "}
              <span className="font-medium">{ticketType}</span>
            </p>

            <p>
              <span className="text-gray-500">Price:</span>{" "}
              <span className="font-medium">{ticketPrice}</span>
            </p>

            <p>
              <span className="text-gray-500">Ticket code:</span>{" "}
              <span className="font-mono font-medium">{ticket.ticket_code}</span>
            </p>

            <p>
              <span className="text-gray-500">Status:</span>{" "}
              <span className="font-medium">{ticket.status}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/tickets/${ticket.id}`}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Open ticket
          </Link>

          {event?.slug ? (
            <Link
              href={`/events/${event.slug}`}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              View event
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ClientDashboard({ profile, tickets }: ClientDashboardProps) {
  return (
    <section className="rounded-lg border p-6">
      <div>
        <h2 className="text-xl font-semibold">Client Dashboard</h2>

        <p className="mt-2 text-gray-600">
          Welcome, {profile.full_name ?? profile.email}.
        </p>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Your tickets</h3>

        {tickets.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-gray-600">
            You do not have any tickets yet.
          </div>
        )}
      </div>
    </section>
  );
}