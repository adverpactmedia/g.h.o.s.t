import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { POST as analyzePost } from "../../../analyze/route";
import { createInternalPollToken } from "@/lib/analysis-poll-token";
import { verifyInternalSignature } from "@/lib/internal-auth";
import { claimInternalEvent, completeInternalEvent, failInternalEvent } from "@/lib/internal-event-store";

export const runtime = "nodejs";
export const maxDuration = 30;

function noStoreHeaders() {
  return { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };
}

/**
 * Private server-to-server bridge. STABLOCITY signs the exact request body;
 * browser clients cannot submit meeting transcripts through this endpoint.
 */
export async function POST(request: Request) {
  const secret = process.env.STABLOCITY_GHOST_WEBHOOK_SECRET?.trim() || "";
  if (secret.length < 32) {
    return NextResponse.json(
      { error: "The STABLOCITY integration is not configured." },
      { status: 503, headers: noStoreHeaders() }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "The request body could not be read." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > 150_000) {
    return NextResponse.json(
      { error: "The meeting request is empty or too large." },
      { status: 413, headers: noStoreHeaders() }
    );
  }

  const valid = verifyInternalSignature({
    secret,
    timestamp: request.headers.get("x-stablocity-timestamp") || "",
    eventId: request.headers.get("x-stablocity-event-id") || "",
    signature: request.headers.get("x-stablocity-signature") || "",
    rawBody,
  });

  if (!valid) {
    return NextResponse.json(
      { error: "The internal request signature is invalid or expired." },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  const eventId = request.headers.get("x-stablocity-event-id") || "";
  const bodyHash = createHash("sha256").update(rawBody, "utf8").digest("hex");
  let claim;
  try {
    claim = await claimInternalEvent(eventId, bodyHash);
  } catch {
    return NextResponse.json(
      { error: "The durable meeting handoff store is unavailable. No analysis was started." },
      { status: 503, headers: noStoreHeaders() }
    );
  }

  if (claim.state === "unconfigured") {
    return NextResponse.json(
      { error: "The durable meeting handoff store is not configured." },
      { status: 503, headers: noStoreHeaders() }
    );
  }
  if (claim.state === "conflict") {
    return NextResponse.json(
      { error: "This event ID has already been used for a different meeting payload." },
      { status: 409, headers: noStoreHeaders() }
    );
  }
  if (claim.state === "processing") {
    return NextResponse.json(
      { status: "processing", retryAfterSeconds: 5 },
      { status: 202, headers: { ...noStoreHeaders(), "Retry-After": "5" } }
    );
  }
  if (claim.state === "completed") {
    try {
      return NextResponse.json(
        {
          interactionId: claim.interactionId,
          pollToken: createInternalPollToken(claim.interactionId),
          status: "in_progress",
          duplicate: true,
        },
        { headers: noStoreHeaders() }
      );
    } catch {
      return NextResponse.json(
        { error: "The completed meeting handoff could not be resumed." },
        { status: 503, headers: noStoreHeaders() }
      );
    }
  }

  const forwarded = new Request(new URL("/api/analyze", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // This server-only marker is accepted only after the outer HMAC check.
      "x-ghost-internal-forward": secret,
    },
    body: rawBody,
  });
  try {
    const response = await analyzePost(forwarded);
    const payload = await response.json().catch(() => ({ error: "Analysis service returned an unreadable response." }));
    if (response.ok && typeof payload?.interactionId === "string") {
      try {
        await completeInternalEvent(eventId, bodyHash, payload.interactionId);
      } catch {
        return NextResponse.json(
          { error: "Analysis started but its durable handoff receipt could not be saved. Retry this event shortly." },
          { status: 503, headers: noStoreHeaders() }
        );
      }
    } else {
      await failInternalEvent(eventId, bodyHash).catch(() => undefined);
    }
    return NextResponse.json(payload, {
      status: response.status,
      headers: noStoreHeaders(),
    });
  } catch {
    await failInternalEvent(eventId, bodyHash).catch(() => undefined);
    return NextResponse.json(
      { error: "The meeting analysis could not be started." },
      { status: 502, headers: noStoreHeaders() }
    );
  }
}
