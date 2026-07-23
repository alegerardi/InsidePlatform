import Link from "next/link";
import type { StatsEvent } from "../../../lib/events/get-event-for-stats";
import type { OrganizerEventStats } from "../../../lib/events/get-organizer-event-stats";
import {
  formatDate,
  formatPercentage,
  formatPrice,
} from "./event-statistics-formatters";
import type { EventCategory } from "./event-statistics-types";
import { MetricCard } from "./metric-card";

type StatisticsHeroProps = {
  event: StatsEvent;
  category: EventCategory;
  stats: OrganizerEventStats;
};

export function StatisticsHero({ event, category, stats }: StatisticsHeroProps) {
  const heroThirdMetric =
    category === "upcoming"
      ? stats.paid_remaining_capacity + stats.guest_list_remaining_capacity
      : stats.successful_entrances;

  return (
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
  );
}