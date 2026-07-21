import Link from "next/link";
import type { StatsEvent } from "../../lib/events/get-event-for-stats";
import type {
  OrganizerEntranceTimeStats,
  OrganizerEventStats,
  OrganizerTicketTypeStats,
} from "../../lib/events/get-organizer-event-stats";

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
    paid_tickets_sold: 0,
    guest_list_tickets_claimed: 0,

    active_tickets: 0,
    used_tickets: 0,
    cancelled_tickets: 0,

    gross_revenue_cents: 0,

    successful_entrances: 0,
    paid_successful_entrances: 0,
    guest_list_successful_entrances: 0,

    duplicate_scan_attempts: 0,
    invalid_scan_attempts: 0,

    event_remaining_capacity: 0,
    paid_remaining_capacity: 0,
    guest_list_remaining_capacity: 0,

    page_views: 0,
  };
}

function MetricCard({
  label,
  value,
  helper,
  large = false,
}: {
  label: string;
  value: string | number;
  helper?: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p
        className={
          large
            ? "mt-3 text-4xl font-semibold tracking-tight text-white"
            : "mt-3 text-3xl font-semibold tracking-tight text-white"
        }
      >
        {value}
      </p>

      {helper ? <p className="mt-2 text-sm text-white/45">{helper}</p> : null}
    </div>
  );
}

function ProgressBar({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-white"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function CapacityCard({
  title,
  issued,
  remaining,
  entrances,
  capacity,
  showEntrances,
}: {
  title: string;
  issued: number;
  remaining: number;
  entrances: number;
  capacity: number;
  showEntrances: boolean;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
            Capacity pool
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
        </div>

        <p className="text-sm text-white/45">{remaining} left</p>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-white/50">Issued</span>
          <span className="font-medium text-white">
            {issued} / {capacity}
          </span>
        </div>

        <ProgressBar value={issued} max={capacity} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/35">Issued</p>
          <p className="mt-1 text-2xl font-semibold text-white">{issued}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/35">
            {showEntrances ? "Entrances" : "Remaining"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {showEntrances ? entrances : remaining}
          </p>
        </div>
      </div>
    </section>
  );
}

function TicketMix({
  ticketTypeStats,
  showEntrances,
}: {
  ticketTypeStats: OrganizerTicketTypeStats[];
  showEntrances: boolean;
}) {
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

function OperationalSummary({
  category,
  stats,
}: {
  category: EventCategory;
  stats: OrganizerEventStats;
}) {
  if (category === "upcoming") {
    return null;
  }

  const stillExpected = Math.max(
    stats.tickets_sold - stats.successful_entrances,
    0
  );

  const noShows = Math.max(stats.tickets_sold - stats.successful_entrances, 0);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
        {category === "ongoing" ? "Live door" : "Final result"}
      </p>

      <h3 className="mt-2 text-xl font-semibold text-white">
        {category === "ongoing" ? "Entrance control" : "Attendance"}
      </h3>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/35">Entrances</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {stats.successful_entrances}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/35">
            {category === "ongoing" ? "Expected" : "No-shows"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {category === "ongoing" ? stillExpected : noShows}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/35">Check-in rate</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {formatPercentage(stats.successful_entrances, stats.tickets_sold)}
          </p>
        </div>
      </div>

      {(stats.duplicate_scan_attempts > 0 || stats.invalid_scan_attempts > 0) ? (
        <p className="mt-5 text-sm text-white/45">
          {stats.duplicate_scan_attempts} duplicate scans ·{" "}
          {stats.invalid_scan_attempts} invalid scans
        </p>
      ) : null}
    </section>
  );
}

function EntranceTimeline({
  rows,
}: {
  rows: OrganizerEntranceTimeStats[];
}) {
  if (rows.length === 0) {
    return null;
  }

  const maxValue = Math.max(...rows.map((row) => row.successful_entrances), 1);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
        Timeline
      </p>

      <h3 className="mt-2 text-xl font-semibold text-white">
        Entrances over time
      </h3>

      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <div key={`${row.event_id}-${row.bucket_start}`}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-white/75">
                {formatTime(row.bucket_start)}
              </span>

              <span className="text-white/45">
                {row.successful_entrances}
              </span>
            </div>

            <ProgressBar value={row.successful_entrances} max={maxValue} />
          </div>
        ))}
      </div>
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
  const showEntrances = category !== "upcoming";

  const paidCapacity = stats.paid_tickets_sold + stats.paid_remaining_capacity;
  const guestListCapacity =
    stats.guest_list_tickets_claimed + stats.guest_list_remaining_capacity;

  const heroThirdMetric =
    category === "upcoming"
      ? stats.paid_remaining_capacity + stats.guest_list_remaining_capacity
      : stats.successful_entrances;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/30">
      <section className="border-b border-white/10 p-8 md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/40">
              {category} statistics
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
              {event.title}
            </h1>

            <p className="mt-3 text-sm text-white/45">
              {formatDate(event.starts_at)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {event.slug ? (
              <Link
                href={`/events/${event.slug}`}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Public page
              </Link>
            ) : null}

            <Link
              href="/dashboard"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-85"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Gross revenue"
            value={formatPrice(stats.gross_revenue_cents)}
            helper="Issued paid tickets"
            large
          />

          <MetricCard
            label="Issued"
            value={stats.tickets_sold}
            helper={`${stats.paid_tickets_sold} paid · ${stats.guest_list_tickets_claimed} guest list`}
            large
          />

          <MetricCard
            label={category === "upcoming" ? "Capacity left" : "Entrances"}
            value={heroThirdMetric}
            helper={
              category === "upcoming"
                ? `${stats.paid_remaining_capacity} paid · ${stats.guest_list_remaining_capacity} guest list`
                : `${stats.paid_successful_entrances} paid · ${stats.guest_list_successful_entrances} guest list`
            }
            large
          />
        </div>

        {category === "upcoming" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <MetricCard
              label="Page views"
              value={stats.page_views}
              helper="Public event page visits"
            />

            <MetricCard
              label="Conversion"
              value={formatPercentage(stats.tickets_sold, stats.page_views)}
              helper="Issued tickets / page views"
            />
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 p-8 md:p-10 lg:grid-cols-2">
        <CapacityCard
          title="Paid tickets"
          issued={stats.paid_tickets_sold}
          remaining={stats.paid_remaining_capacity}
          entrances={stats.paid_successful_entrances}
          capacity={paidCapacity}
          showEntrances={showEntrances}
        />

        <CapacityCard
          title="Guest list"
          issued={stats.guest_list_tickets_claimed}
          remaining={stats.guest_list_remaining_capacity}
          entrances={stats.guest_list_successful_entrances}
          capacity={guestListCapacity}
          showEntrances={showEntrances}
        />
      </section>

      <section className="grid gap-6 border-t border-white/10 p-8 md:p-10 lg:grid-cols-[1fr_380px]">
        <TicketMix
          ticketTypeStats={ticketTypeStats}
          showEntrances={showEntrances}
        />

        <div className="grid gap-6">
          <OperationalSummary category={category} stats={stats} />

          {category === "past" ? (
            <EntranceTimeline rows={entranceTimeStats} />
          ) : null}
        </div>
      </section>
    </div>
  );
}