import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

function getSafeNextPath(request: NextRequest) {
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  const isProtectedDashboardRoute =
    request.nextUrl.pathname === "/dashboard" ||
    request.nextUrl.pathname.startsWith("/dashboard/");

  if (isProtectedDashboardRoute && (error || !data?.claims)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", getSafeNextPath(request));

    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}