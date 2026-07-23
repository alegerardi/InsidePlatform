type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitBucket>();

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkInMemoryRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const safeLimit = Math.max(limit, 1);
  const safeWindowMs = Math.max(windowMs, 1000);

  cleanupExpiredBuckets(now);

  const existingBucket = buckets.get(key);

  if (!existingBucket || existingBucket.resetAt <= now) {
    const resetAt = now + safeWindowMs;

    buckets.set(key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      limit: safeLimit,
      remaining: safeLimit - 1,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (existingBucket.count >= safeLimit) {
    return {
      allowed: false,
      limit: safeLimit,
      remaining: 0,
      resetAt: existingBucket.resetAt,
      retryAfterSeconds: Math.max(
        Math.ceil((existingBucket.resetAt - now) / 1000),
        1
      ),
    };
  }

  existingBucket.count += 1;

  return {
    allowed: true,
    limit: safeLimit,
    remaining: Math.max(safeLimit - existingBucket.count, 0),
    resetAt: existingBucket.resetAt,
    retryAfterSeconds: 0,
  };
}

export function getRateLimitHeaders(result: RateLimitResult) {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };

  if (!result.allowed) {
    headers["Retry-After"] = result.retryAfterSeconds.toString();
  }

  return headers;
}