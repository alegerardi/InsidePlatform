"use client";

import { useFormStatus } from "react-dom";
import { removeEventStaffAction } from "../../lib/actions/event-staff";

type RemoveStaffButtonProps = {
  eventId: string;
  staffUserId: string;
  redirectPath: string;
  staffEmail: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Removing..." : "Remove"}
    </button>
  );
}

export function RemoveStaffButton({
  eventId,
  staffUserId,
  redirectPath,
  staffEmail,
}: RemoveStaffButtonProps) {
  return (
    <form
      action={removeEventStaffAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove ${staffEmail} from this event? They will no longer be able to validate tickets for this event.`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="staff_user_id" value={staffUserId} />
      <input type="hidden" name="redirect_path" value={redirectPath} />

      <SubmitButton />
    </form>
  );
}