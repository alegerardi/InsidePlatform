import { headers } from "next/headers";
import { checkInMemoryRateLimit } from "../rate-limit/in-memory-rate-limit";
import { createClient } from "../supabase/server";

const PAGE_VIEW_RATE_LIMIT = {
  limit: 3,
  windowMs: 60_000,
};

async function getPageViewRateLimitKey(eventId: string) {
  try {
    const requestHeaders = await headers();

    const forwardedFor = requestHeaders
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();

    const realIp = requestHeaders.get("x-real-ip")?.trim();
    const cloudflareIp = requestHeaders.get("cf-connecting-ip")?.trim();
    const userAgent = requestHeaders.get("user-agent") ?? "unknown";

    const visitorIdentity =
      cloudflareIp || forwardedFor || realIp || `ua:${userAgent}`;

    return `page-view:${eventId}:${visitorIdentity}`;
  } catch {
    return `page-view:${eventId}:unknown`;
  }
}

export async function recordEventPageView(eventId: string) {
  const rateLimitKey = await getPageViewRateLimitKey(eventId);

  const rateLimitResult = checkInMemoryRateLimit({
    key: rateLimitKey,
    limit: PAGE_VIEW_RATE_LIMIT.limit,
    windowMs: PAGE_VIEW_RATE_LIMIT.windowMs,
  });

  if (!rateLimitResult.allowed) {
    return;
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("record_event_page_view", {
    target_event_id: eventId,
  });

  if (error) {
    console.warn("recordEventPageView failed", {
      eventId,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });
  }
}