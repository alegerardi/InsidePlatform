import Link from "next/link";
import { claimTicketAction } from "../../lib/actions/tickets";
import type { PublicTicketType } from "../../lib/events/get-event";

type ClaimTicketFormProps = {
  eventId: string;
  eventSlug: string;
  ticketTypes: PublicTicketType[];
  existingTicketId?: string | null;
};

function formatPrice(priceCents: number, currency = "EUR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

function getPoolLabel(ticketType: PublicTicketType) {
  return ticketType.capacity_pool === "guest_list" ? "Guest list" : "Paid";
}

function TicketTypeCard({
  ticketType,
  defaultChecked,
}: {
  ticketType: PublicTicketType;
  defaultChecked: boolean;
}) {
  const isSoldOut = ticketType.is_sold_out;

  return (
    <label
      className={
        isSoldOut
          ? "block rounded-2xl border border-white/10 bg-white/[0.02] p-5 opacity-45"
          : "group block cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/30 hover:bg-white/[0.05] has-[:checked]:border-white has-[:checked]:bg-white/[0.08]"
      }
    >
      <div className="flex items-start gap-4">
        <input
          type="radio"
          name="ticket_type_id"
          value={ticketType.id}
          required
          disabled={isSoldOut}
          defaultChecked={!isSoldOut && defaultChecked}
          className="mt-1 h-4 w-4 accent-white disabled:cursor-not-allowed"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  {ticketType.title}
                </h3>

                <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-medium text-white/70">
                  {getPoolLabel(ticketType)}
                </span>

                {isSoldOut ? (
                  <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-medium text-white/50">
                    Sold out
                  </span>
                ) : null}
              </div>

              {ticketType.description ? (
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
                  {ticketType.description}
                </p>
              ) : null}
            </div>

            <p className="shrink-0 text-lg font-semibold text-white">
              {formatPrice(ticketType.price_cents, ticketType.currency)}
            </p>
          </div>
        </div>
      </div>
    </label>
  );
}

export function ClaimTicketForm({
  eventId,
  eventSlug,
  ticketTypes,
  existingTicketId,
}: ClaimTicketFormProps) {
  const availableTicketTypes = ticketTypes.filter(
    (ticketType) => !ticketType.is_sold_out
  );

  const paidTicketTypes = ticketTypes.filter(
    (ticketType) => ticketType.capacity_pool === "paid"
  );

  const guestListTicketTypes = ticketTypes.filter(
    (ticketType) => ticketType.capacity_pool === "guest_list"
  );

  const firstAvailableTicketTypeId = availableTicketTypes[0]?.id;
  const hasAvailableTickets = availableTicketTypes.length > 0;

  if (existingTicketId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Ticket ready</h2>

        <p className="mt-2 text-sm text-white/55">
          Your ticket for this event has already been issued.
        </p>

        <Link
          href={`/tickets/${existingTicketId}`}
          className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
        >
          Open ticket
        </Link>
      </div>
    );
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Tickets unavailable</h2>

        <p className="mt-2 text-sm text-white/55">
          Ticket selection is not available for this event.
        </p>
      </div>
    );
  }

  return (
    <form
      action={claimTicketAction}
      className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl shadow-black/20"
    >
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="event_slug" value={eventSlug} />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
          Tickets
        </p>

        <h2 className="text-2xl font-semibold text-white">Select access</h2>
      </div>

      {paidTicketTypes.length > 0 ? (
        <section className="mt-6">
          <div className="grid gap-3">
            {paidTicketTypes.map((ticketType) => (
              <TicketTypeCard
                key={ticketType.id}
                ticketType={ticketType}
                defaultChecked={ticketType.id === firstAvailableTicketTypeId}
              />
            ))}
          </div>
        </section>
      ) : null}

      {guestListTicketTypes.length > 0 ? (
        <section className="mt-4">
          <div className="grid gap-3">
            {guestListTicketTypes.map((ticketType) => (
              <TicketTypeCard
                key={ticketType.id}
                ticketType={ticketType}
                defaultChecked={ticketType.id === firstAvailableTicketTypeId}
              />
            ))}
          </div>
        </section>
      ) : null}

      <button
        type="submit"
        disabled={!hasAvailableTickets}
        className={
          hasAvailableTickets
            ? "mt-6 w-full rounded-xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:opacity-85"
            : "mt-6 w-full cursor-not-allowed rounded-xl border border-white/10 px-5 py-4 text-sm font-semibold text-white/40"
        }
      >
        {hasAvailableTickets ? "Continue" : "Sold out"}
      </button>
    </form>
  );
}