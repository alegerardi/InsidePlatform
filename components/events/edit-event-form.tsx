import { updateEventAction } from "../../lib/actions/event-update";
import type {
  EditableEvent,
  EditableTicketType,
  TicketCapacityPool,
} from "../../lib/events/get-event-for-edit";

type EditEventFormProps = {
  event: EditableEvent;
  ticketTypes: EditableTicketType[];
  error?: string;
  message?: string;
};

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function centsToEuroInput(value: number) {
  return (value / 100).toFixed(2);
}

function getTicketTypeAt(ticketTypes: EditableTicketType[], index: number) {
  return ticketTypes[index] ?? null;
}

function TicketTypeFields({
  ticketType,
  number,
  required = false,
}: {
  ticketType: EditableTicketType | null;
  number: number;
  required?: boolean;
}) {
  const defaultCapacityPool: TicketCapacityPool =
    ticketType?.capacity_pool ?? (number === 3 ? "guest_list" : "paid");

  return (
    <div className="mt-5 rounded-md border border-dashed p-4">
      <h3 className="font-medium">
        Ticket type {number} {required ? "" : "optional"}
      </h3>

      <input
        type="hidden"
        name={`ticket_type_${number}_id`}
        value={ticketType?.id ?? ""}
      />

      <div className="mt-4 grid gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={`ticket_type_${number}_title`} className="text-sm font-medium">
            Title
          </label>
          <input
            id={`ticket_type_${number}_title`}
            name={`ticket_type_${number}_title`}
            type="text"
            required={required}
            defaultValue={ticketType?.title ?? ""}
            placeholder={
              number === 2 ? "VIP" : number === 3 ? "Guest List" : "General Admission"
            }
            className="rounded-md border px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`ticket_type_${number}_description`} className="text-sm font-medium">
            Description
          </label>
          <textarea
            id={`ticket_type_${number}_description`}
            name={`ticket_type_${number}_description`}
            rows={2}
            defaultValue={ticketType?.description ?? ""}
            placeholder={number === 3 ? "Free guest-list entrance." : ""}
            className="rounded-md border px-3 py-2"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label htmlFor={`ticket_type_${number}_price`} className="text-sm font-medium">
              Price in euros
            </label>
            <input
              id={`ticket_type_${number}_price`}
              name={`ticket_type_${number}_price`}
              type="number"
              min={0}
              step="0.01"
              required={required}
              defaultValue={ticketType ? centsToEuroInput(ticketType.price_cents) : ""}
              placeholder={number === 2 ? "25.00" : number === 3 ? "0.00" : "10.00"}
              className="rounded-md border px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`ticket_type_${number}_max_quantity`} className="text-sm font-medium">
              Max quantity
            </label>
            <input
              id={`ticket_type_${number}_max_quantity`}
              name={`ticket_type_${number}_max_quantity`}
              type="number"
              min={1}
              defaultValue={ticketType?.max_quantity ?? ""}
              placeholder={number === 2 ? "20" : number === 3 ? "30" : "150"}
              className="rounded-md border px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`ticket_type_${number}_capacity_pool`} className="text-sm font-medium">
              Capacity pool
            </label>
            <select
              id={`ticket_type_${number}_capacity_pool`}
              name={`ticket_type_${number}_capacity_pool`}
              defaultValue={defaultCapacityPool}
              className="rounded-md border px-3 py-2"
            >
              <option value="paid">Paid capacity</option>
              <option value="guest_list">Guest-list capacity</option>
            </select>
          </div>
        </div>

        {ticketType ? (
          <p className="text-xs text-gray-500">
            If this ticket type already has issued tickets, its capacity pool cannot be changed.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function EditEventForm({
  event,
  ticketTypes,
  error,
  message,
}: EditEventFormProps) {
  const firstTicketType = getTicketTypeAt(ticketTypes, 0);
  const secondTicketType = getTicketTypeAt(ticketTypes, 1);
  const thirdTicketType = getTicketTypeAt(ticketTypes, 2);

  return (
    <form action={updateEventAction} className="flex w-full max-w-2xl flex-col gap-5">
      <input type="hidden" name="event_id" value={event.id} />
      <input type="hidden" name="event_slug" value={event.slug ?? ""} />

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          Event title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={event.title}
          className="rounded-md border px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={event.description ?? ""}
          className="rounded-md border px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="location" className="text-sm font-medium">
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          required
          defaultValue={event.location ?? ""}
          className="rounded-md border px-3 py-2"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="starts_at" className="text-sm font-medium">
            Starts at
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={toDateTimeLocalValue(event.starts_at)}
            className="rounded-md border px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="ends_at" className="text-sm font-medium">
            Ends at
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={toDateTimeLocalValue(event.ends_at)}
            className="rounded-md border px-3 py-2"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="max_tickets" className="text-sm font-medium">
            Paid-ticket capacity
          </label>
          <input
            id="max_tickets"
            name="max_tickets"
            type="number"
            min={1}
            required
            defaultValue={event.max_tickets}
            className="rounded-md border px-3 py-2"
          />
          <p className="text-xs text-gray-500">
            Paid ticket types consume this capacity.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="max_guest_list" className="text-sm font-medium">
            Guest-list capacity
          </label>
          <input
            id="max_guest_list"
            name="max_guest_list"
            type="number"
            min={0}
            required
            defaultValue={event.max_guest_list}
            className="rounded-md border px-3 py-2"
          />
          <p className="text-xs text-gray-500">
            Guest-list ticket types consume this capacity.
          </p>
        </div>
      </div>

      <section className="rounded-lg border p-5">
        <h2 className="text-lg font-semibold">Ticket types</h2>

        <p className="mt-1 text-sm text-gray-600">
          Choose whether each ticket type consumes paid-ticket capacity or guest-list capacity.
        </p>

        <TicketTypeFields ticketType={firstTicketType} number={1} required />
        <TicketTypeFields ticketType={secondTicketType} number={2} />
        <TicketTypeFields ticketType={thirdTicketType} number={3} />
      </section>

      {message ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button type="submit" className="rounded-md bg-black px-4 py-2 font-medium text-white">
        Update event
      </button>
    </form>
  );
}