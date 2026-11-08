
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const globalStore = globalThis as typeof globalThis & {
  __ghostRateLimitStore?: RateLimitStore;
};

const store =
  globalStore.__ghostRateLimitStore ??
  (globalStore.__ghostRateLimitStore = new Map());

export function checkRateLimit(
  request: Request,
  scope: string,
  maximum: number,
  windowSeconds: number
) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  const ip =
    request.headers.get("x-real-ip") ||
    forwarded ||
    "unknown";

  const key = `${scope}:${ip}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Remove expired entries to prevent unlimited map growth.
  for (const [entryKey, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(entryKey);
    }
  }

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfter: 0,
    };
  }

  if (existing.count >= maximum) {
    return {
      allowed: false,
      retryAfter: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
      ),
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: true,
    retryAfter: 0,
  };
}
