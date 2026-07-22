"use client";

import { useFormStatus } from "react-dom";
import { cancelEventAction } from "../../lib/actions/event-cancel";

type CancelEventCardProps = {
  eventId: string;
  eventSlug: string | null;
  status: string;
  category: "upcoming" | "ongoing" | "past";
  feedback?: {
    message?: string;
    error?: string;
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Cancelling..." : "Cancel event"}
    </button>
  );
}

export function CancelEventCard({
  eventId,
  eventSlug,
  status,
  category,
  feedback,
}: CancelEventCardProps) {
  const isUpcoming = category === "upcoming";
  const isAlreadyCancelled = status === "cancelled";
  const isCompleted = status === "completed";
  const canAttemptCancel = isUpcoming && !isAlreadyCancelled && !isCompleted;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
            Cancel event
          </p>

          <h3 className="mt-2 text-lg font-semibold text-white">
            Soft cancellation
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Cancelling hides the public page and cancels active tickets. Event
            records, tickets, stats, staff assignments, and logs stay stored.
          </p>
        </div>

        <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/55">
          {status}
        </span>
      </div>

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

      {!canAttemptCancel ? (
        <div className="mt-6 rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/45">
          This event cannot be cancelled from this control.
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-white">Cancel this event</p>

              <p className="mt-1 text-sm text-white/45">
                Available only when the event has made €0.00.
              </p>
            </div>

            <form
              action={cancelEventAction}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    "Cancel this event? The public page will be hidden and active tickets will be cancelled. No database records will be deleted."
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="event_slug" value={eventSlug ?? ""} />

              <SubmitButton />
            </form>
          </div>
        </div>
      )}
    </section>
  );
}