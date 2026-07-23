import { CopyEventLinkButton } from "../../events/copy-event-link-button";
import type { EventWithCategory } from "./organizer-dashboard-types";

type OrganizerLinksPanelProps = {
  event: EventWithCategory;
  baseUrl: string;
};

export function OrganizerLinksPanel({
  event,
  baseUrl,
}: OrganizerLinksPanelProps) {
  if (!event.slug) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
        This event does not have a public link.
      </div>
    );
  }

  const eventUrl = `${baseUrl}/events/${event.slug}`;

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-lg font-semibold text-white">Public event link</h3>

        <p className="mt-2 break-all rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-white/60">
          {eventUrl}
        </p>

        <div className="mt-5">
          <CopyEventLinkButton eventUrl={eventUrl} />
        </div>
      </section>
    </div>
  );
}