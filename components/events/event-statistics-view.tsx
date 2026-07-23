import { CapacityCard } from "./statistics/capacity-card";
import { EntranceTimeline } from "./statistics/entrance-timeline";
import { getFallbackStats } from "./statistics/event-statistics-fallback";
import type { EventStatisticsViewProps } from "./statistics/event-statistics-types";
import { OperationalSummary } from "./statistics/operational-summary";
import { StatisticsHero } from "./statistics/statistics-hero";
import { TicketMix } from "./statistics/ticket-mix";

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

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/30">
      <StatisticsHero event={event} category={category} stats={stats} />

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