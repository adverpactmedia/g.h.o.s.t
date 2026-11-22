import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

const request = (headers: Record<string, string> = {}) =>
  new Request("https://ghost.example/api/analyze", { headers });

describe("shared G.H.O.S.T. rate limits", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key-long-enough";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("consumes separate IP and device buckets using hashed identifiers", async () => {
    // Return a fresh Response for each call: response bodies are single-use.
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify([{ allowed: true, retry_after: 0, hit_count: 1 }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit(
      request({ "x-real-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.99", "user-agent": "Test Browser" }),
      "analyze",
      12,
      900
    );

    expect(result).toEqual({ allowed: true, retryAfter: 0, storeAvailable: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(firstBody.p_bucket_key).toMatch(/^[a-f0-9]{64}$/);
    expect(secondBody.p_bucket_key).toMatch(/^[a-f0-9]{64}$/);
    expect(firstBody.p_bucket_key).not.toBe(secondBody.p_bucket_key);
    expect(JSON.stringify([firstBody, secondBody])).not.toContain("203.0.113.10");
  });

  it("fails closed when Supabase is not configured", async () => {
    delete process.env.SUPABASE_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit(
      request({ "x-real-ip": "203.0.113.10" }),
      "analyze",
      12,
      900
    );

    expect(result.allowed).toBe(false);
    expect(result.storeAvailable).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores spoofable forwarded-for when the trusted edge IP is absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit(
      request({ "x-forwarded-for": "203.0.113.10", "user-agent": "Test Browser" }),
      "analyze",
      12,
      900
    );

    expect(result.allowed).toBe(false);
    expect(result.storeAvailable).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the shared quota denial and retry interval", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ allowed: true, retry_after: 0, hit_count: 1 }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ allowed: false, retry_after: 42, hit_count: 7 }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit(
      request({ "x-real-ip": "203.0.113.10", "user-agent": "Test Browser" }),
      "transcribe",
      6,
      900
    );

    expect(result).toEqual({ allowed: false, retryAfter: 42, storeAvailable: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the shared quota service returns an error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit(
      request({ "x-real-ip": "203.0.113.10", "user-agent": "Test Browser" }),
      "analyze",
      12,
      900
    );

    expect(result.allowed).toBe(false);
    expect(result.storeAvailable).toBe(false);
  });
});
