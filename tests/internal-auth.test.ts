import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyInternalSignature } from "../src/lib/internal-auth";

describe("STABLOCITY internal request signature", () => {
  const secret = "s".repeat(48);
  const rawBody = JSON.stringify({
    title: "Quarterly review",
    style: "direct",
    outputLanguage: "English",
    transcript: "The team agreed to deliver the revised proposal by Friday.",
  });
  const timestamp = "1795111200";
  const eventId = "meet-event-12345678";

  function signature(body = rawBody, ts = timestamp, id = eventId) {
    return createHmac("sha256", secret)
      .update(ts + "." + id + "." + body, "utf8")
      .digest("base64url");
  }

  it("accepts a correctly signed recent request", () => {
    expect(verifyInternalSignature({
      secret, timestamp, eventId, signature: signature(), rawBody,
      nowSeconds: Number(timestamp),
    })).toBe(true);
  });

  it("rejects a modified body", () => {
    expect(verifyInternalSignature({
      secret, timestamp, eventId, signature: signature(), rawBody: rawBody + " ",
      nowSeconds: Number(timestamp),
    })).toBe(false);
  });

  it("rejects expired timestamps and malformed event IDs", () => {
    expect(verifyInternalSignature({
      secret, timestamp, eventId, signature: signature(), rawBody,
      nowSeconds: Number(timestamp) + 301,
    })).toBe(false);
    expect(verifyInternalSignature({
      secret, timestamp, eventId: "bad id", signature: signature(), rawBody,
      nowSeconds: Number(timestamp),
    })).toBe(false);
  });

  it("rejects short shared secrets and invalid signatures", () => {
    expect(verifyInternalSignature({
      secret: "short", timestamp, eventId, signature: signature(), rawBody,
      nowSeconds: Number(timestamp),
    })).toBe(false);
    expect(verifyInternalSignature({
      secret, timestamp, eventId, signature: "not-a-signature", rawBody,
      nowSeconds: Number(timestamp),
    })).toBe(false);
  });
});
