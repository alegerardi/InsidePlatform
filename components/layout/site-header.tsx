import Link from "next/link";
import { getUser } from "../../lib/auth/get-user";
import { LogoutButton } from "../auth/logout-button";

export async function SiteHeader() {
  const user = await getUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold">
          Inside Platform
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:underline">
                Dashboard
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:underline">
                Login
              </Link>
              <Link href="/signup" className="text-sm font-medium hover:underline">
                Signup
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}