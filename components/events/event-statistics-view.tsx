import Link from "next/link";
import type {
  OrganizerEntranceTimeStats,
  OrganizerEventStats,
  OrganizerTicketTypeStats,
} from "../../lib/events/get-organizer-event-stats";
import type { StatsEvent } from "../../lib/events/get-event-for-stats";

type EventCategory = "upcoming" | "ongoing" | "past";

type EventStatisticsViewProps = {
  event: StatsEvent;
  category: EventCategory;
  eventStats?: OrganizerEventStats;
  ticketTypeStats: OrganizerTicketTypeStats[];
  entranceTimeStats: OrganizerEntranceTimeStats[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
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

function formatPercentage(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "0%";
  }

  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function getFallbackStats(eventId: string): OrganizerEventStats {
  return {
    event_id: eventId,
    tickets_sold: 0,
    active_tickets: 0,
    used_tickets: 0,
    cancelled_tickets: 0,
    gross_revenue_cents: 0,
    successful_entrances: 0,
    duplicate_scan_attempts: 0,
    invalid_scan_attempts: 0,
    event_remaining_capacity: 0,
    page_views: 0,
  };
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {helper ? <p className="mt-2 text-xs text-zinc-500">{helper}</p> : null}
    </div>
  );
}

function HorizontalBarChart({
  title,
  rows,
}: {
  title: string;
  rows: {
    label: string;
    value: number;
    helper?: string;
  }[];
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="font-semibold text-white">{title}</h3>

      {rows.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {rows.map((row) => {
            const width = Math.max(
              (row.value / maxValue) * 100,
              row.value > 0 ? 5 : 0
            );

            return (
              <div key={row.label}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-zinc-200">{row.label}</span>
                  <span className="text-zinc-400">{row.value}</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${width}%` }}
                  />
                </div>

                {row.helper ? (
                  <p className="mt-1 text-xs text-zinc-500">{row.helper}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">No data yet.</p>
      )}
    </section>
  );
}

function TicketTypeTable({
  ticketTypeStats,
  showEntrances,
}: {
  ticketTypeStats: OrganizerTicketTypeStats[];
  showEntrances: boolean;
}) {
  if (ticketTypeStats.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="font-semibold text-white">Ticket type details</h3>
        <p className="mt-3 text-sm text-zinc-400">No ticket types found.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="font-semibold text-white">Ticket type details</h3>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              <th className="py-3 pr-4 font-medium">Type</th>
              <th className="py-3 pr-4 font-medium">Price</th>
              <th className="py-3 pr-4 font-medium">Sold</th>
              {showEntrances ? (
                <th className="py-3 pr-4 font-medium">Entrances</th>
              ) : null}
              <th className="py-3 pr-4 font-medium">Remaining</th>
              <th className="py-3 pr-4 font-medium">Revenue</th>
            </tr>
          </thead>

          <tbody>
            {ticketTypeStats.map((ticketType) => (
              <tr
                key={ticketType.ticket_type_id}
                className="border-b border-zinc-800 last:border-0"
              >
                <td className="py-3 pr-4 text-zinc-100">
                  <span className="font-medium">
                    {ticketType.ticket_type_title}
                  </span>

                  {!ticketType.is_active ? (
                    <span className="ml-2 rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500">
                      inactive
                    </span>
                  ) : null}
                </td>

                <td className="py-3 pr-4 text-zinc-300">
                  {formatPrice(ticketType.price_cents, ticketType.currency)}
                </td>

                <td className="py-3 pr-4 text-zinc-300">
                  {ticketType.sold_count}
                </td>

                {showEntrances ? (
                  <td className="py-3 pr-4 text-zinc-300">
                    {ticketType.successful_entrances}
                  </td>
                ) : null}

                <td className="py-3 pr-4 text-zinc-300">
                  {ticketType.remaining_quantity ?? "Unlimited"}
                </td>

                <td className="py-3 pr-4 text-zinc-300">
                  {formatPrice(
                    ticketType.gross_revenue_cents,
                    ticketType.currency
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EntranceTimelineChart({
  rows,
}: {
  rows: OrganizerEntranceTimeStats[];
}) {
  const maxValue = Math.max(...rows.map((row) => row.successful_entrances), 1);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="font-semibold text-white">Entrances over time</h3>

      {rows.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {rows.map((row) => {
            const width = Math.max(
              (row.successful_entrances / maxValue) * 100,
              row.successful_entrances > 0 ? 5 : 0
            );

            return (
              <div key={`${row.event_id}-${row.bucket_start}`}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-zinc-200">
                    {formatTime(row.bucket_start)}
                  </span>
                  <span className="text-zinc-400">
                    {row.successful_entrances}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">
          No entrances recorded yet.
        </p>
      )}
    </section>
  );
}

export function EventStatisticsView({
  event,
  category,
  eventStats,
  ticketTypeStats,
  entranceTimeStats,
}: EventStatisticsViewProps) {
  const stats = eventStats ?? getFallbackStats(event.id);

  const stillExpected = Math.max(
    stats.tickets_sold - stats.successful_entrances,
    0
  );

  const noShows = Math.max(stats.tickets_sold - stats.successful_entrances, 0);

  const soldRows = ticketTypeStats.map((ticketType) => ({
    label: ticketType.ticket_type_title,
    value: ticketType.sold_count,
    helper: formatPrice(ticketType.gross_revenue_cents, ticketType.currency),
  }));

  const entranceRows = ticketTypeStats.map((ticketType) => ({
    label: ticketType.ticket_type_title,
    value: ticketType.successful_entrances,
  }));

  const showEntrances = category !== "upcoming";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100">
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            {category} event statistics
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">{event.title}</h1>

          <p className="mt-2 text-zinc-400">{formatDate(event.starts_at)}</p>

          {event.location ? (
            <p className="mt-1 text-zinc-400">{event.location}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {event.slug ? (
            <Link
              href={`/events/${event.slug}`}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100"
            >
              Public page
            </Link>
          ) : null}

          <Link
            href="/dashboard"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {category === "upcoming" ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Page views" value={stats.page_views} />
            <StatCard label="Tickets sold" value={stats.tickets_sold} />
            <StatCard
              label="Conversion"
              value={formatPercentage(stats.tickets_sold, stats.page_views)}
              helper="tickets / views"
            />
            <StatCard
              label="Gross revenue"
              value={formatPrice(stats.gross_revenue_cents)}
            />
            <StatCard
              label="Remaining capacity"
              value={stats.event_remaining_capacity}
            />
          </div>

          <div className="mt-6 grid gap-6">
            <HorizontalBarChart title="Tickets sold by type" rows={soldRows} />

            <TicketTypeTable
              ticketTypeStats={ticketTypeStats}
              showEntrances={false}
            />
          </div>
        </>
      ) : null}

      {category === "ongoing" ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Tickets sold" value={stats.tickets_sold} />
            <StatCard
              label="Gross revenue"
              value={formatPrice(stats.gross_revenue_cents)}
            />
            <StatCard label="Entrances" value={stats.successful_entrances} />
            <StatCard label="Still expected" value={stillExpected} />
            <StatCard
              label="Duplicate scans"
              value={stats.duplicate_scan_attempts}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <HorizontalBarChart title="Tickets sold by type" rows={soldRows} />
            <HorizontalBarChart title="Entrances by type" rows={entranceRows} />
          </div>

          <div className="mt-6">
            <TicketTypeTable
              ticketTypeStats={ticketTypeStats}
              showEntrances={showEntrances}
            />
          </div>
        </>
      ) : null}

      {category === "past" ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Gross revenue"
              value={formatPrice(stats.gross_revenue_cents)}
            />
            <StatCard label="Tickets sold" value={stats.tickets_sold} />
            <StatCard label="Entrances" value={stats.successful_entrances} />
            <StatCard
              label="No-shows"
              value={noShows}
              helper={formatPercentage(noShows, stats.tickets_sold)}
            />
            <StatCard
              label="Check-in rate"
              value={formatPercentage(
                stats.successful_entrances,
                stats.tickets_sold
              )}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <HorizontalBarChart title="Tickets sold by type" rows={soldRows} />
            <HorizontalBarChart title="Entrances by type" rows={entranceRows} />
          </div>

          <div className="mt-6 grid gap-6">
            <EntranceTimelineChart rows={entranceTimeStats} />

            <TicketTypeTable
              ticketTypeStats={ticketTypeStats}
              showEntrances={showEntrances}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}