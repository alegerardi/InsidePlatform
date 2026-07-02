import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { sanitizeNextPath } from "../../../lib/auth/sanitize-next-path";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Authentication%20failed", requestUrl.origin)
  );
}