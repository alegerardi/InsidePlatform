import type { OrganizerEventStats } from "../../../lib/events/get-organizer-event-stats";
import type { EventCategory } from "./event-statistics-types";
import { formatPercentage } from "./event-statistics-formatters";

type OperationalSummaryProps = {
  category: EventCategory;
  stats: OrganizerEventStats;
};

export function OperationalSummary({
  category,
  stats,
}: OperationalSummaryProps) {
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

      {stats.duplicate_scan_attempts > 0 || stats.invalid_scan_attempts > 0 ? (
        <p className="mt-5 text-sm text-white/45">
          {stats.duplicate_scan_attempts} duplicate scans ·{" "}
          {stats.invalid_scan_attempts} invalid scans
        </p>
      ) : null}
    </section>
  );
}