import { createEventAction } from "../../lib/actions/events";

type CreateEventFormProps = {
  error?: string;
};

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
            Maximum tickets
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
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="max_guest_list" className="text-sm font-medium">
            Maximum guest-list entries
          </label>
          <input
            id="max_guest_list"
            name="max_guest_list"
            type="number"
            min={0}
            required
            defaultValue={0}
            className="rounded-md border px-3 py-2"
          />
        </div>
      </div>

      <section className="rounded-lg border p-5">
        <div>
          <h2 className="text-lg font-semibold">Ticket types</h2>
          <p className="mt-1 text-sm text-gray-600">
            Add up to 3 ticket types for now. You can leave ticket type 2 and 3 empty.
          </p>
        </div>

        <div className="mt-5 grid gap-6">
          <div className="rounded-md border border-dashed p-4">
            <h3 className="font-medium">Ticket type 1</h3>

            <div className="mt-4 grid gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="ticket_type_1_title" className="text-sm font-medium">
                  Title
                </label>
                <input
                  id="ticket_type_1_title"
                  name="ticket_type_1_title"
                  type="text"
                  required
                  defaultValue="General Admission"
                  className="rounded-md border px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="ticket_type_1_description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="ticket_type_1_description"
                  name="ticket_type_1_description"
                  rows={2}
                  defaultValue="Standard entrance ticket."
                  className="rounded-md border px-3 py-2"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="ticket_type_1_price" className="text-sm font-medium">
                    Price in euros
                  </label>
                  <input
                    id="ticket_type_1_price"
                    name="ticket_type_1_price"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    defaultValue="10.00"
                    className="rounded-md border px-3 py-2"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="ticket_type_1_max_quantity" className="text-sm font-medium">
                    Max quantity
                  </label>
                  <input
                    id="ticket_type_1_max_quantity"
                    name="ticket_type_1_max_quantity"
                    type="number"
                    min={1}
                    placeholder="150"
                    className="rounded-md border px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-dashed p-4">
            <h3 className="font-medium">Ticket type 2 optional</h3>

            <div className="mt-4 grid gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="ticket_type_2_title" className="text-sm font-medium">
                  Title
                </label>
                <input
                  id="ticket_type_2_title"
                  name="ticket_type_2_title"
                  type="text"
                  placeholder="VIP"
                  className="rounded-md border px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="ticket_type_2_description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="ticket_type_2_description"
                  name="ticket_type_2_description"
                  rows={2}
                  placeholder="Fast entrance, reserved area, etc."
                  className="rounded-md border px-3 py-2"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="ticket_type_2_price" className="text-sm font-medium">
                    Price in euros
                  </label>
                  <input
                    id="ticket_type_2_price"
                    name="ticket_type_2_price"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="25.00"
                    className="rounded-md border px-3 py-2"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="ticket_type_2_max_quantity" className="text-sm font-medium">
                    Max quantity
                  </label>
                  <input
                    id="ticket_type_2_max_quantity"
                    name="ticket_type_2_max_quantity"
                    type="number"
                    min={1}
                    placeholder="20"
                    className="rounded-md border px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-dashed p-4">
            <h3 className="font-medium">Ticket type 3 optional</h3>

            <div className="mt-4 grid gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="ticket_type_3_title" className="text-sm font-medium">
                  Title
                </label>
                <input
                  id="ticket_type_3_title"
                  name="ticket_type_3_title"
                  type="text"
                  placeholder="Early Bird"
                  className="rounded-md border px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="ticket_type_3_description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="ticket_type_3_description"
                  name="ticket_type_3_description"
                  rows={2}
                  placeholder="Discounted first batch."
                  className="rounded-md border px-3 py-2"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="ticket_type_3_price" className="text-sm font-medium">
                    Price in euros
                  </label>
                  <input
                    id="ticket_type_3_price"
                    name="ticket_type_3_price"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="7.00"
                    className="rounded-md border px-3 py-2"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="ticket_type_3_max_quantity" className="text-sm font-medium">
                    Max quantity
                  </label>
                  <input
                    id="ticket_type_3_max_quantity"
                    name="ticket_type_3_max_quantity"
                    type="number"
                    min={1}
                    placeholder="50"
                    className="rounded-md border px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>
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