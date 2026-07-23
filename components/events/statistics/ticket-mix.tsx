import type { OrganizerTicketTypeStats } from "../../../lib/events/get-organizer-event-stats";
import { formatPrice } from "./event-statistics-formatters";
import { ProgressBar } from "./progress-bar";

type TicketMixProps = {
  ticketTypeStats: OrganizerTicketTypeStats[];
  showEntrances: boolean;
};

export function TicketMix({ ticketTypeStats, showEntrances }: TicketMixProps) {
  const maxIssued = Math.max(
    ...ticketTypeStats.map((ticketType) => ticketType.sold_count),
    1
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
            Breakdown
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">Ticket mix</h3>
        </div>

        <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/50">
          {ticketTypeStats.length} types
        </span>
      </div>

      {ticketTypeStats.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {ticketTypeStats.map((ticketType) => (
            <div
              key={ticketType.ticket_type_id}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-white">
                      {ticketType.ticket_type_title}
                    </h4>

                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/50">
                      {ticketType.capacity_pool === "guest_list"
                        ? "Guest list"
                        : "Paid"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-white/45">
                    {formatPrice(ticketType.price_cents, ticketType.currency)}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="font-semibold text-white">
                    {ticketType.sold_count} issued
                  </p>

                  {showEntrances ? (
                    <p className="mt-1 text-sm text-white/45">
                      {ticketType.successful_entrances} entrances
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-white/45">
                      {ticketType.remaining_quantity ?? "Unlimited"} left
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar value={ticketType.sold_count} max={maxIssued} />
              </div>

              {ticketType.gross_revenue_cents > 0 ? (
                <p className="mt-3 text-sm text-white/45">
                  {formatPrice(
                    ticketType.gross_revenue_cents,
                    ticketType.currency
                  )}{" "}
                  revenue
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-5 text-sm text-white/45">
          No ticket data yet.
        </div>
      )}
    </section>
  );
}