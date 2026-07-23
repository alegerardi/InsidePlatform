import { addEventStaffAction } from "../../../lib/actions/event-staff";
import type { EventStaffAssignment } from "../../../lib/events/get-organizer-event-staff";
import { RemoveStaffButton } from "../../events/remove-staff-button";
import type {
  EventWithCategory,
  OrganizerFeedback,
} from "./organizer-dashboard-types";
import {
  getDashboardHref,
  getEventStaff,
} from "./organizer-dashboard-utils";

type OrganizerStaffPanelProps = {
  event: EventWithCategory;
  staffAssignments: EventStaffAssignment[];
  feedback?: OrganizerFeedback;
};

export function OrganizerStaffPanel({
  event,
  staffAssignments,
  feedback,
}: OrganizerStaffPanelProps) {
  const eventStaff = getEventStaff(event.id, staffAssignments);
  const redirectPath = event.slug
    ? getDashboardHref(event.slug, "staff")
    : "/dashboard";

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Assigned staff
            </h3>
            <p className="mt-1 text-sm text-white/45">
              Users allowed to validate tickets for this event.
            </p>
          </div>

          <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/60">
            {eventStaff.length}
          </span>
        </div>

        {eventStaff.length > 0 ? (
          <div className="mt-5 grid gap-2">
            {eventStaff.map((assignment) => (
              <div
                key={`${assignment.event_id}-${assignment.staff_user_id}`}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {assignment.staff_email}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    Can validate this event
                  </p>
                </div>

                <RemoveStaffButton
                  eventId={event.id}
                  staffUserId={assignment.staff_user_id}
                  staffEmail={assignment.staff_email}
                  redirectPath={redirectPath}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/45">
            No staff assigned yet.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-lg font-semibold text-white">Add staff</h3>

        <form
          action={addEventStaffAction}
          className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"
        >
          <input type="hidden" name="event_id" value={event.id} />
          <input type="hidden" name="redirect_path" value={redirectPath} />

          <input
            name="staff_email"
            type="email"
            required
            placeholder="staff@example.com"
            className="rounded-xl border border-white/15 bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
          />

          <button
            type="submit"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
          >
            Add staff
          </button>
        </form>

        {feedback?.message ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            {feedback.message}
          </p>
        ) : null}

        {feedback?.error ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            {feedback.error}
          </p>
        ) : null}
      </section>
    </div>
  );
}