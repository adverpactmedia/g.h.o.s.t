import { z } from "zod";
export const analyzeSchema = z.object({
  transcript: z.string().trim().min(30, "Add at least a few sentences of transcript.").max(120_000),
  style: z.enum(["direct", "warm", "executive", "casual"]),
  title: z.string().trim().min(1).max(120).default("Untitled meeting"),
});
export const styleInstructions: Record<z.infer<typeof analyzeSchema>["style"], string> = {
  direct: "Plain, concise, candid. No filler. Use short sentences.",
  warm: "Warm, human, considerate and clear. Avoid corporate jargon.",
  executive: "Brief, structured, decision-oriented and professional.",
  casual: "Natural, relaxed and conversational without being sloppy.",
};
