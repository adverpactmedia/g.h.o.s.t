import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyInternalSignature(input: {
  secret: string;
  timestamp: string;
  eventId: string;
  signature: string;
  rawBody: string;
  nowSeconds?: number;
}): boolean {
  const { secret, timestamp, eventId, signature, rawBody } = input;
  if (secret.length < 32) return false;
  if (!/^\d{10}$/.test(timestamp)) return false;
  if (!/^[A-Za-z0-9:_-]{8,200}$/.test(eventId)) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const issuedAt = Number(timestamp);
  if (!Number.isSafeInteger(issuedAt) || Math.abs(now - issuedAt) > 300) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(timestamp + "." + eventId + "." + rawBody, "utf8")
    .digest();
  const supplied = Buffer.from(signature, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
