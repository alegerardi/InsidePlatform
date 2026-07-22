import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketQrCode } from "../../../components/tickets/ticket-qr-code";
import { requireUser } from "../../../lib/auth/require-user";
import { getTicket } from "../../../lib/tickets/get-ticket";

type TicketPageProps = {
  params: Promise<{
    ticketId: string;
  }>;
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPrice(priceCents: number, currency = "EUR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

function getStatusLabel(status: string) {
  if (status === "active") {
    return "Valid";
  }

  if (status === "used") {
    return "Checked in";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return status;
}

function getStatusDescription(status: string) {
  if (status === "active") {
    return "Show this QR code at the entrance.";
  }

  if (status === "used") {
    return "This ticket has already been used for entry.";
  }

  if (status === "cancelled") {
    return "This ticket is no longer valid.";
  }

  return "Ticket status updated.";
}

function getAccessLabel(capacityPool: string) {
  return capacityPool === "guest_list" ? "Guest list" : "Paid";
}

export default async function TicketPage({ params }: TicketPageProps) {
  const user = await requireUser("/login");
  const { ticketId } = await params;
  const ticket = await getTicket(ticketId, user.id);

  if (!ticket) {
    notFound();
  }

  const qrPayload = ticket.qr_token;
  const event = ticket.events;

  const eventTitle = event?.title ?? "Event";
  const eventSlug = event?.slug;
  const eventLocation = event?.location ?? "Location not specified";
  const ticketType = ticket.ticket_type_title_snapshot ?? "General Admission";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/30">
        <section className="grid gap-10 border-b border-white/10 p-8 md:p-10 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white/55">
                  {getStatusLabel(ticket.status)}
                </span>

                <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white/55">
                  {getAccessLabel(ticket.ticket_capacity_pool_snapshot)}
                </span>
              </div>

              <p className="mt-8 text-xs font-medium uppercase tracking-[0.26em] text-white/35">
                Ticket
              </p>

              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
                {eventTitle}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-white/60">
                {getStatusDescription(ticket.status)}
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
                  Access
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {ticketType}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
                  Price
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatPrice(
                    ticket.ticket_price_cents_snapshot,
                    ticket.ticket_currency_snapshot
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
                  Code
                </p>
                <p className="mt-2 font-mono text-sm font-semibold text-white">
                  {ticket.ticket_code}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <TicketQrCode qrPayload={qrPayload} />

            <p className="mt-5 text-center text-sm text-white/45">
              Scan at the entrance
            </p>
          </div>
        </section>

        <section className="grid gap-6 p-8 md:p-10 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            {event?.starts_at ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
                  Date
                </p>

                <p className="mt-3 text-lg font-semibold leading-7 text-white">
                  {formatEventDate(event.starts_at)}
                </p>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
                Location
              </p>

              <p className="mt-3 text-lg font-semibold leading-7 text-white">
                {eventLocation}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
              Actions
            </p>

            <div className="mt-5 grid gap-3">
              {eventSlug ? (
                <Link
                  href={`/events/${eventSlug}`}
                  className="rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-black transition hover:opacity-85"
                >
                  Open event page
                </Link>
              ) : null}

              <Link
                href="/dashboard"
                className="rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-white/10"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}