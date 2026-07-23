import type { OrganizerEntranceTimeStats } from "../../../lib/events/get-organizer-event-stats";
import { formatTime } from "./event-statistics-formatters";
import { ProgressBar } from "./progress-bar";

type EntranceTimelineProps = {
  rows: OrganizerEntranceTimeStats[];
};

export function EntranceTimeline({ rows }: EntranceTimelineProps) {
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

              <span className="text-white/45">{row.successful_entrances}</span>
            </div>

            <ProgressBar value={row.successful_entrances} max={maxValue} />
          </div>
        ))}
      </div>
    </section>
  );
}