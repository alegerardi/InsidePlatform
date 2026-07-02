import { signOutAction } from "../../lib/actions/auth";

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm font-medium hover:underline">
        Logout
      </button>
    </form>
  );
}