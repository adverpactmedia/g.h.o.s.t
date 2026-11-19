import { NextResponse } from "next/server";
import { POST as analyzePost } from "../../../analyze/route";
import { verifyInternalSignature } from "@/lib/internal-auth";

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

  const forwarded = new Request(new URL("/api/analyze", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
  const response = await analyzePost(forwarded);
  const payload = await response.json().catch(() => ({ error: "Analysis service returned an unreadable response." }));

  return NextResponse.json(payload, {
    status: response.status,
    headers: noStoreHeaders(),
  });
}
