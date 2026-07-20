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

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 font-medium text-white"
      >
        Create event
      </button>
    </form>
  );
}