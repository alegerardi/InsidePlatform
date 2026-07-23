import type { EventStaffAssignment } from "../../../lib/events/get-organizer-event-staff";
import { OrganizerActionsPanel } from "./organizer-actions-panel";
import type {
  EventWithCategory,
  OrganizerFeedback,
  OrganizerTab,
} from "./organizer-dashboard-types";
import { formatEventDate, getStaffCount } from "./organizer-dashboard-utils";
import { OrganizerEventTabs } from "./organizer-event-tabs";
import { OrganizerLinksPanel } from "./organizer-links-panel";
import { OrganizerOverviewPanel } from "./organizer-overview-panel";
import { OrganizerStaffPanel } from "./organizer-staff-panel";

type OrganizerSelectedEventPanelProps = {
  event: EventWithCategory;
  selectedTab: OrganizerTab;
  staffAssignments: EventStaffAssignment[];
  feedback?: OrganizerFeedback;
  baseUrl: string;
};

export function OrganizerSelectedEventPanel({
  event,
  selectedTab,
  staffAssignments,
  feedback,
  baseUrl,
}: OrganizerSelectedEventPanelProps) {
  const staffCount = getStaffCount(event.id, staffAssignments);

  if (!event.slug) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        This event is missing a slug.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/35">
            Selected party
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
            {event.title}
          </h2>

          <p className="mt-2 text-sm text-white/45">
            {formatEventDate(event.starts_at)}
          </p>
        </div>

        <OrganizerEventTabs eventSlug={event.slug} selectedTab={selectedTab} />
      </div>

      <div className="mt-6">
        {selectedTab === "overview" ? (
          <OrganizerOverviewPanel event={event} staffCount={staffCount} />
        ) : null}

        {selectedTab === "staff" ? (
          <OrganizerStaffPanel
            event={event}
            staffAssignments={staffAssignments}
            feedback={feedback}
          />
        ) : null}

        {selectedTab === "links" ? (
          <OrganizerLinksPanel event={event} baseUrl={baseUrl} />
        ) : null}

        {selectedTab === "actions" ? (
          <OrganizerActionsPanel event={event} feedback={feedback} />
        ) : null}
      </div>
    </section>
  );
}