import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyInternalSignature } from "./internal-auth";

describe("verifyInternalSignature", () => {
  const secret = "test-secret-with-at-least-thirty-two-characters";
  const timestamp = "1795132800";
  const eventId = "meet-event-12345678";
  const rawBody = JSON.stringify({ title: "Test meeting", transcript: "A transcript." });
  const signature = createHmac("sha256", secret)
    .update(timestamp + "." + eventId + "." + rawBody, "utf8")
    .digest("base64url");

  it("accepts an exact, current signed request", () => {
    expect(verifyInternalSignature({ secret, timestamp, eventId, signature, rawBody, nowSeconds: Number(timestamp) })).toBe(true);
  });

  it("rejects a modified body", () => {
    expect(verifyInternalSignature({ secret, timestamp, eventId, signature, rawBody: rawBody + " ", nowSeconds: Number(timestamp) })).toBe(false);
  });

  it("rejects an expired timestamp", () => {
    expect(verifyInternalSignature({ secret, timestamp, eventId, signature, rawBody, nowSeconds: Number(timestamp) + 301 })).toBe(false);
  });

  it("rejects malformed event identifiers and signatures", () => {
    expect(verifyInternalSignature({ secret, timestamp, eventId: "bad", signature, rawBody, nowSeconds: Number(timestamp) })).toBe(false);
    expect(verifyInternalSignature({ secret, timestamp, eventId, signature: "invalid", rawBody, nowSeconds: Number(timestamp) })).toBe(false);
  });
});
