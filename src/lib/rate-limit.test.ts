import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

const request = (headers: Record<string, string> = {}) =>
  new Request("https://ghost.example/api/analyze", { headers });

describe("shared G.H.O.S.T. rate limits", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key-long-enough";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  it("uses separate hashed IP and device buckets", async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ allowed: true, retry_after: 0 }]), { status: 200 }));
    vi.stubGlobal("fetch", mock);
    const result = await checkRateLimit(request({ "x-real-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.99", "user-agent": "Test Browser" }), "analyze", 12, 900);
    expect(result).toEqual({ allowed: true, retryAfter: 0, storeAvailable: true });
    expect(mock).toHaveBeenCalledTimes(2);
    const first = JSON.parse(String(mock.mock.calls[0][1]?.body));
    const second = JSON.parse(String(mock.mock.calls[1][1]?.body));
    expect(first.p_bucket_key).toMatch(/^[a-f0-9]{64}$/);
    expect(second.p_bucket_key).toMatch(/^[a-f0-9]{64}$/);
    expect(first.p_bucket_key).not.toBe(second.p_bucket_key);
    expect(JSON.stringify([first, second])).not.toContain("203.0.113.10");
  });
  it("fails closed when Supabase is not configured", async () => {
    delete process.env.SUPABASE_URL;
    const mock = vi.fn(); vi.stubGlobal("fetch", mock);
    const result = await checkRateLimit(request({ "x-real-ip": "203.0.113.10" }), "analyze", 12, 900);
    expect(result.storeAvailable).toBe(false);
    expect(mock).not.toHaveBeenCalled();
  });
  it("does not trust forwarded-for without the trusted edge IP in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const mock = vi.fn(); vi.stubGlobal("fetch", mock);
    const result = await checkRateLimit(request({ "x-forwarded-for": "203.0.113.10" }), "analyze", 12, 900);
    expect(result.storeAvailable).toBe(false);
    expect(mock).not.toHaveBeenCalled();
  });
  it("returns shared quota denials", async () => {
    const mock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ allowed: true, retry_after: 0 }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ allowed: false, retry_after: 42 }]), { status: 200 }));
    vi.stubGlobal("fetch", mock);
    const result = await checkRateLimit(request({ "x-real-ip": "203.0.113.10", "user-agent": "Test" }), "transcribe", 6, 900);
    expect(result).toEqual({ allowed: false, retryAfter: 42, storeAvailable: true });
  });
  it("fails closed when the shared quota service errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    const result = await checkRateLimit(request({ "x-real-ip": "203.0.113.10" }), "analyze", 12, 900);
    expect(result.storeAvailable).toBe(false);
  });
});
