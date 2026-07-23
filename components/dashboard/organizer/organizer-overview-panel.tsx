import type { EventWithCategory } from "./organizer-dashboard-types";
import { formatEventDate } from "./organizer-dashboard-utils";

type OrganizerOverviewPanelProps = {
  event: EventWithCategory;
  staffCount: number;
};

export function OrganizerOverviewPanel({
  event,
  staffCount,
}: OrganizerOverviewPanelProps) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
            Date
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-white">
            {formatEventDate(event.starts_at)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
            Location
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-white">
            {event.location ?? "No location"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
            Capacity
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-white">
            {event.max_tickets} paid · {event.max_guest_list} guest list
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/35">
          Status
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70">
            {event.status}
          </span>

          <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70">
            {event.category}
          </span>

          <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70">
            {staffCount} staff
          </span>
        </div>
      </div>
    </div>
  );
}