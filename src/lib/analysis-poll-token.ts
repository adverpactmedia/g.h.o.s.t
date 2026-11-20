import { createHmac } from "node:crypto";

export function pollSecret(apiKey: string): string {
  return process.env.GHOST_SESSION_SECRET?.trim() || apiKey;
}

export function createAnalysisPollToken(interactionId: string, apiKey: string): string {
  const expires = Math.floor(Date.now() / 1000) + 30 * 60;
  const payload = interactionId + "." + expires;
  const signature = createHmac("sha256", pollSecret(apiKey))
    .update(payload)
    .digest("base64url");
  return expires + "." + signature;
}

export function createInternalPollToken(interactionId: string): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("G.H.O.S.T. is not configured.");
  return createAnalysisPollToken(interactionId, apiKey);
}
