import { redirect } from "next/navigation";
import { getUser } from "./get-user";

export async function requireUser(nextPath = "/dashboard") {
  const user = await getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}