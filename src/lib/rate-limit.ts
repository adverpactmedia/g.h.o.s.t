import { createHmac } from "node:crypto";

type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
  storeAvailable: boolean;
};

function configuration() {
  const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!baseUrl.startsWith("https://") || serviceKey.length < 20) return null;
  return { baseUrl, serviceKey };
}

function getClientIdentity(request: Request) {
  // x-real-ip is set by Vercel at the trusted edge. Never trust caller-supplied x-forwarded-for.
  const ip = request.headers.get("x-real-ip")?.trim() || "";
  const userAgent = request.headers.get("user-agent")?.trim() || "";
  if (ip && ip.length <= 128) return { ip, userAgent: userAgent.slice(0, 512) || "unknown" };

  // Local development has no trusted edge header. Keep it isolated to one local bucket.
  if (process.env.NODE_ENV !== "production") {
    return { ip: "local-development", userAgent: userAgent.slice(0, 512) || "unknown" };
  }
  return null;
}

function bucketHash(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

async function consume(
  baseUrl: string,
  serviceKey: string,
  bucketKey: string,
  maximum: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfter: number } | null> {
  const response = await fetch(baseUrl + "/rest/v1/rpc/ghost_consume_rate_limit", {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_bucket_key: bucketKey,
      p_limit: maximum,
      p_window_seconds: windowSeconds,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) return null;
  const value: unknown = await response.json();
  if (!Array.isArray(value) || !value[0] || typeof value[0].allowed !== "boolean") return null;
  const retryAfter = Number(value[0].retry_after);
  if (!Number.isFinite(retryAfter) || retryAfter < 0) return null;
  return { allowed: value[0].allowed, retryAfter: value[0].allowed ? 0 : Math.max(1, Math.ceil(retryAfter)) };
}

export async function checkRateLimit(
  request: Request,
  scope: string,
  maximum: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const cfg = configuration();
  const identity = getClientIdentity(request);
  if (!cfg || !identity || !Number.isInteger(maximum) || maximum < 1 ||
      !Number.isInteger(windowSeconds) || windowSeconds < 1) {
    return { allowed: false, retryAfter: 60, storeAvailable: false };
  }

  const keys = [
    bucketHash(cfg.serviceKey, "ip:" + scope + ":" + identity.ip),
    bucketHash(cfg.serviceKey, "device:" + scope + ":" + identity.ip + ":" + identity.userAgent),
  ];
  try {
    for (const key of keys) {
      const result = await consume(cfg.baseUrl, cfg.serviceKey, key, maximum, windowSeconds);
      if (!result) return { allowed: false, retryAfter: 60, storeAvailable: false };
      if (!result.allowed) return { allowed: false, retryAfter: result.retryAfter, storeAvailable: true };
    }
    return { allowed: true, retryAfter: 0, storeAvailable: true };
  } catch {
    return { allowed: false, retryAfter: 60, storeAvailable: false };
  }
}
