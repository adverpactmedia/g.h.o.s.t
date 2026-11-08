type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const MAX_ENTRIES = 5_000;

const globalStore = globalThis as typeof globalThis & {
  __ghostRateLimitStore?: RateLimitStore;
};

const store =
  globalStore.__ghostRateLimitStore ??
  (globalStore.__ghostRateLimitStore = new Map());

function getClientIdentifier(request: Request): string {
  // Vercel supplies x-real-ip at the platform boundary.
  // The forwarded header is retained as a fallback for local environments.
  const realIp = request.headers.get("x-real-ip")?.trim();

  if (realIp) return realIp;

  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return forwarded || "unknown";
}

function removeExpiredEntries(now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

function makeRoom() {
  while (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;

    if (oldestKey === undefined) break;

    store.delete(oldestKey);
  }
}

export function checkRateLimit(
  request: Request,
  scope: string,
  maximum: number,
  windowSeconds: number
) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const identifier = getClientIdentifier(request);
  const key = `${scope}:${identifier}`;

  removeExpiredEntries(now);

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    makeRoom();

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