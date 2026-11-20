export type InternalEventClaim =
  | { state: "claimed" }
  | { state: "processing" }
  | { state: "completed"; interactionId: string }
  | { state: "conflict" }
  | { state: "unconfigured" };

type EventRow = {
  event_id: string;
  body_hash: string;
  status: "processing" | "completed" | "failed";
  interaction_id: string | null;
  lease_expires_at: string | null;
};

function config() {
  const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return baseUrl.startsWith("https://") && serviceKey.length >= 20
    ? { baseUrl, serviceKey }
    : null;
}

function headers(serviceKey: string, prefer?: string): HeadersInit {
  return {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function readRows(response: Response): Promise<EventRow[]> {
  if (!response.ok) throw new Error("Internal event storage request failed.");
  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error("Internal event storage returned invalid data.");
  return value as EventRow[];
}

export async function claimInternalEvent(
  eventId: string,
  bodyHash: string
): Promise<InternalEventClaim> {
  const cfg = config();
  if (!cfg) return { state: "unconfigured" };
  if (!/^[A-Za-z0-9:_-]{8,200}$/.test(eventId) || !/^[a-f0-9]{64}$/.test(bodyHash)) {
    return { state: "conflict" };
  }

  const now = new Date();
  const lease = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const table = cfg.baseUrl + "/rest/v1/ghost_internal_events";
  const inserted = await fetch(table + "?on_conflict=event_id", {
    method: "POST",
    headers: headers(cfg.serviceKey, "resolution=ignore-duplicates,return=representation"),
    body: JSON.stringify({
      event_id: eventId,
      body_hash: bodyHash,
      status: "processing",
      lease_expires_at: lease,
      updated_at: now.toISOString(),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  const insertedRows = await readRows(inserted);
  if (insertedRows.length > 0) return { state: "claimed" };

  const lookup = await fetch(
    table + "?event_id=eq." + encodeURIComponent(eventId) + "&select=event_id,body_hash,status,interaction_id,lease_expires_at",
    {
      headers: headers(cfg.serviceKey),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }
  );
  const rows = await readRows(lookup);
  const row = rows[0];
  if (!row) throw new Error("Internal event claim could not be confirmed.");
  if (row.body_hash !== bodyHash) return { state: "conflict" };
  if (row.status === "completed" && row.interaction_id) {
    return { state: "completed", interactionId: row.interaction_id };
  }
  if (row.status === "processing" && row.lease_expires_at && Date.parse(row.lease_expires_at) > now.getTime()) {
    return { state: "processing" };
  }

  const filter =
    table +
    "?event_id=eq." + encodeURIComponent(eventId) +
    "&body_hash=eq." + bodyHash +
    (row.status === "failed"
      ? "&status=eq.failed"
      : "&status=eq.processing&lease_expires_at=lt." + encodeURIComponent(now.toISOString()));
  const reclaimed = await fetch(filter, {
    method: "PATCH",
    headers: headers(cfg.serviceKey, "return=representation"),
    body: JSON.stringify({
      status: "processing",
      lease_expires_at: lease,
      interaction_id: null,
      updated_at: now.toISOString(),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  const reclaimedRows = await readRows(reclaimed);
  return reclaimedRows.length ? { state: "claimed" } : { state: "processing" };
}

export async function completeInternalEvent(
  eventId: string,
  bodyHash: string,
  interactionId: string
): Promise<void> {
  const cfg = config();
  if (!cfg) throw new Error("Internal event storage is not configured.");
  const response = await fetch(
    cfg.baseUrl + "/rest/v1/ghost_internal_events?event_id=eq." + encodeURIComponent(eventId) +
      "&body_hash=eq." + bodyHash + "&status=eq.processing",
    {
      method: "PATCH",
      headers: headers(cfg.serviceKey, "return=representation"),
      body: JSON.stringify({
        status: "completed",
        interaction_id: interactionId,
        lease_expires_at: null,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }
  );
  const rows = await readRows(response);
  if (rows.length !== 1) throw new Error("Internal event completion could not be committed.");
}

export async function failInternalEvent(eventId: string, bodyHash: string): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  const response = await fetch(
    cfg.baseUrl + "/rest/v1/ghost_internal_events?event_id=eq." + encodeURIComponent(eventId) +
      "&body_hash=eq." + bodyHash + "&status=eq.processing",
    {
      method: "PATCH",
      headers: headers(cfg.serviceKey, "return=minimal"),
      body: JSON.stringify({
        status: "failed",
        lease_expires_at: null,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }
  );
  if (!response.ok) throw new Error("Internal event failure state could not be stored.");
}
