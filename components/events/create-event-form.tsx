import { createEventAction } from "../../lib/actions/events";

type CreateEventFormProps = {
  error?: string;
};

function TicketTypeFields({
  number,
  required = false,
  defaultTitle = "",
  defaultDescription = "",
  defaultPrice = "",
  defaultQuantity = "",
}: {
  number: number;
  required?: boolean;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultPrice?: string;
  defaultQuantity?: string;
}) {
  return (
    <div className="rounded-md border border-dashed p-4">
      <h3 className="font-medium">
        Ticket type {number} {required ? "" : "optional"}
      </h3>

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
            defaultValue={defaultTitle}
            placeholder={number === 2 ? "VIP" : number === 3 ? "Guest List" : "General Admission"}
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
            defaultValue={defaultDescription}
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
              defaultValue={defaultPrice}
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
              defaultValue={defaultQuantity}
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
              defaultValue={number === 3 ? "guest_list" : "paid"}
              className="rounded-md border px-3 py-2"
            >
              <option value="paid">Paid capacity</option>
              <option value="guest_list">Guest-list capacity</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreateEventForm({ error }: CreateEventFormProps) {
  return (
    <form action={createEventAction} className="flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          Event title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="rounded-md border px-3 py-2"
          placeholder="Funk Club World Cup Special"
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
          className="rounded-md border px-3 py-2"
          placeholder="Describe the event, music, vibe, schedule, and important details."
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
          className="rounded-md border px-3 py-2"
          placeholder="Torino, Italy"
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
            defaultValue={150}
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
            defaultValue={30}
            className="rounded-md border px-3 py-2"
          />
          <p className="text-xs text-gray-500">
            Guest-list ticket types consume this capacity.
          </p>
        </div>
      </div>

      <section className="rounded-lg border p-5">
        <div>
          <h2 className="text-lg font-semibold">Ticket types</h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose whether each ticket type consumes paid-ticket capacity or guest-list capacity.
          </p>
        </div>

        <div className="mt-5 grid gap-6">
          <TicketTypeFields
            number={1}
            required
            defaultTitle="General Admission"
            defaultDescription="Standard entrance ticket."
            defaultPrice="10.00"
          />

          <TicketTypeFields number={2} />

          <TicketTypeFields
            number={3}
            defaultTitle="Guest List"
            defaultDescription="Free guest-list entrance."
            defaultPrice="0.00"
            defaultQuantity="30"
          />
        </div>
      </section>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button type="submit" className="rounded-md bg-black px-4 py-2 font-medium text-white">
        Create event
      </button>
    </form>
  );
}