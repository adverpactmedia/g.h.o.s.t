
import { z } from "zod";

export const analyzeSchema = z
  .object({
    transcript: z
      .string()
      .trim()
      .min(30, "Add at least a few sentences of transcript.")
      .max(
        120_000,
        "This transcript is too long. Shorten it and try again."
      ),

    style: z.enum(["direct", "warm", "executive", "casual"]),

    title: z
      .string()
      .trim()
      .min(1, "Add a meeting title.")
      .max(120, "Meeting titles must be 120 characters or fewer.")
      .default("Untitled meeting"),

    outputLanguage: z
      .string()
      .trim()
      .min(2, "Enter a valid output language.")
      .max(80, "Language names must be 80 characters or fewer.")
      .default("English"),
  })
  .strict();

export type AnalysisStyle = z.infer<typeof analyzeSchema>["style"];

export const styleInstructions: Record<AnalysisStyle, string> = {
  direct: "Plain, concise, candid. No filler. Use short sentences.",
  warm: "Warm, human, considerate and clear. Avoid corporate jargon.",
  executive:
    "Brief, structured, decision-oriented and professional.",
  casual:
    "Natural, relaxed and conversational without being sloppy.",
};
