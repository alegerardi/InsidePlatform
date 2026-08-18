import { describe, expect, it, vi } from "vitest";
import { sanitizeNextPath } from "../../lib/auth/sanitize-next-path";
import {
  checkInMemoryRateLimit,
  getRateLimitHeaders,
} from "../../lib/rate-limit/in-memory-rate-limit";
import { slugify } from "../../lib/events/slugify";

describe("sanitizeNextPath", () => {
  it("accepts a local absolute path", () => {
    expect(sanitizeNextPath("/events/summer?ticket=vip")).toBe(
      "/events/summer?ticket=vip"
    );
  });

  it("rejects absolute external URLs", () => {
    expect(sanitizeNextPath("https://evil.example/path")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextPath("//evil.example/path")).toBe("/dashboard");
  });

  it("falls back for missing and non-string values", () => {
    expect(sanitizeNextPath(null)).toBe("/dashboard");
    expect(sanitizeNextPath({} as FormDataEntryValue)).toBe("/dashboard");
  });
});

describe("slugify", () => {
  it("normalizes accents, case, spaces, and punctuation", () => {
    expect(slugify("  Èstate @ Milano!  ")).toBe("estate-milano");
  });

  it("returns a safe fallback for empty input", () => {
    expect(slugify("---")).toBe("event");
  });

  it("limits generated slugs to 70 characters", () => {
    expect(slugify("a".repeat(100))).toHaveLength(70);
  });
});

describe("in-memory rate limiting", () => {
  it("tracks remaining requests and rejects requests over the limit", () => {
    const key = `unit-rate-${crypto.randomUUID()}`;
    expect(
      checkInMemoryRateLimit({ key, limit: 2, windowMs: 60_000 })
    ).toMatchObject({ allowed: true, remaining: 1 });
    expect(
      checkInMemoryRateLimit({ key, limit: 2, windowMs: 60_000 })
    ).toMatchObject({ allowed: true, remaining: 0 });
    expect(
      checkInMemoryRateLimit({ key, limit: 2, windowMs: 60_000 })
    ).toMatchObject({ allowed: false, remaining: 0 });
  });

  it("resets an expired bucket", () => {
    vi.useFakeTimers();
    const key = `unit-reset-${crypto.randomUUID()}`;
    checkInMemoryRateLimit({ key, limit: 1, windowMs: 1000 });
    expect(
      checkInMemoryRateLimit({ key, limit: 1, windowMs: 1000 }).allowed
    ).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(
      checkInMemoryRateLimit({ key, limit: 1, windowMs: 1000 }).allowed
    ).toBe(true);
    vi.useRealTimers();
  });

  it("adds Retry-After only to rejected results", () => {
    const key = `unit-headers-${crypto.randomUUID()}`;
    const allowed = checkInMemoryRateLimit({ key, limit: 1, windowMs: 1000 });
    const rejected = checkInMemoryRateLimit({ key, limit: 1, windowMs: 1000 });
    expect(getRateLimitHeaders(allowed)["Retry-After"]).toBeUndefined();
    expect(getRateLimitHeaders(rejected)["Retry-After"]).toBe("1");
  });
});
