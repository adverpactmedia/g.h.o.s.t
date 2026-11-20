import { afterEach, describe, expect, it, vi } from "vitest";
import { claimInternalEvent, completeInternalEvent, failInternalEvent } from "./internal-event-store";

const eventId = "meet-event-12345678";
const bodyHash = "a".repeat(64);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

describe("GHOST internal event store", () => {
  it("fails closed when Supabase is not configured", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await claimInternalEvent(eventId, bodyHash)).toEqual({ state: "unconfigured" });
  });

  it("claims a new event once", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-long-enough");
    const fetchMock = vi.fn().mockResolvedValue(response([{ event_id: eventId }]));
    vi.stubGlobal("fetch", fetchMock);
    expect(await claimInternalEvent(eventId, bodyHash)).toEqual({ state: "claimed" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a completed interaction for a duplicate event", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-long-enough");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([{ event_id: eventId, body_hash: bodyHash, status: "completed", interaction_id: "interaction_123", lease_expires_at: null }]));
    vi.stubGlobal("fetch", fetchMock);
    expect(await claimInternalEvent(eventId, bodyHash)).toEqual({ state: "completed", interactionId: "interaction_123" });
  });

  it("rejects reuse of an event ID with a different body", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-long-enough");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([{ event_id: eventId, body_hash: "b".repeat(64), status: "completed", interaction_id: "interaction_123", lease_expires_at: null }]));
    vi.stubGlobal("fetch", fetchMock);
    expect(await claimInternalEvent(eventId, bodyHash)).toEqual({ state: "conflict" });
  });

  it("does not steal a live processing lease", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-long-enough");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([{ event_id: eventId, body_hash: bodyHash, status: "processing", interaction_id: null, lease_expires_at: new Date(Date.now() + 60000).toISOString() }]));
    vi.stubGlobal("fetch", fetchMock);
    expect(await claimInternalEvent(eventId, bodyHash)).toEqual({ state: "processing" });
  });

  it("persists completion and failure transitions", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-long-enough");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([{ event_id: eventId }]))
      .mockResolvedValueOnce(response(null, 204));
    vi.stubGlobal("fetch", fetchMock);
    await completeInternalEvent(eventId, bodyHash, "interaction_123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const failMock = vi.fn().mockResolvedValue(response(null, 204));
    vi.stubGlobal("fetch", failMock);
    await failInternalEvent(eventId, bodyHash);
    expect(failMock).toHaveBeenCalledTimes(1);
  });
});
