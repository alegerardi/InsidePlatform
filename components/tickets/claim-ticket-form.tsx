import Link from "next/link";
import { claimTicketAction } from "../../lib/actions/tickets";
import type { PublicTicketType } from "../../lib/events/get-event";

type ClaimTicketFormProps = {
  eventId: string;
  eventSlug: string;
  ticketTypes: PublicTicketType[];
  existingTicketId?: string;
  error?: string;
  message?: string;
};

function formatPrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

export function ClaimTicketForm({
  eventId,
  eventSlug,
  ticketTypes,
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

  if (ticketTypes.length === 0) {
    return (
      <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
        Tickets are not available for this event yet.
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

        <fieldset>
          <legend className="font-semibold">Choose your ticket</legend>

          <div className="mt-4 grid gap-3">
            {ticketTypes.map((ticketType, index) => (
              <label
                key={ticketType.id}
                className="flex cursor-pointer gap-3 rounded-md border p-4"
              >
                <input
                  type="radio"
                  name="ticket_type_id"
                  value={ticketType.id}
                  defaultChecked={index === 0}
                  required
                  className="mt-1"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-medium">{ticketType.title}</p>

                    <p className="font-semibold">
                      {formatPrice(ticketType.price_cents, ticketType.currency)}
                    </p>
                  </div>

                  {ticketType.description ? (
                    <p className="mt-1 text-sm text-gray-600">
                      {ticketType.description}
                    </p>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="mt-5 rounded-md bg-black px-5 py-3 font-medium text-white"
        >
          Claim selected ticket
        </button>
      </form>

      <p className="mt-3 text-sm text-gray-600">
        You must be logged in to claim a ticket.
      </p>
    </div>
  );
}