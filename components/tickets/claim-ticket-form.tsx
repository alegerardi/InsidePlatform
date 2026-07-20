import Link from "next/link";
import { claimTicketAction } from "../../lib/actions/tickets";

type ClaimTicketFormProps = {
  eventId: string;
  eventSlug: string;
  existingTicketId?: string;
  error?: string;
  message?: string;
};

export function ClaimTicketForm({
  eventId,
  eventSlug,
  existingTicketId,
  error,
  message,
}: ClaimTicketFormProps) {
  if (existingTicketId) {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-4">
        <p className="font-medium text-green-800">
          You already have a ticket for this event.
        </p>

        <Link
          href={`/tickets/${existingTicketId}`}
          className="mt-4 inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Open your ticket
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed p-4">
      {error ? (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mb-4 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {message}
        </p>
      ) : null}

      <form action={claimTicketAction}>
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="event_slug" value={eventSlug} />

        <button
          type="submit"
          className="rounded-md bg-black px-5 py-3 font-medium text-white"
        >
          Claim ticket
        </button>
      </form>

      <p className="mt-3 text-sm text-gray-600">
        You must be logged in to claim a ticket.
      </p>
    </div>
  );
}