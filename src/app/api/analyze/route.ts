import OpenAI from "openai";
import { NextResponse } from "next/server";
import { analyzeSchema, styleInstructions } from "@/lib/validation";
import { makeSpokenSummary } from "@/lib/format";
export const runtime = "nodejs";
export const maxDuration = 60;
const outputSchema = {
  type: "object", additionalProperties: false,
  properties: {
    summary: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    actionItems: { type: "array", items: { type: "object", additionalProperties: false, properties: { task: { type: "string" }, owner: { type: "string" }, due: { type: "string" } }, required: ["task", "owner", "due"] } },
    followUp: { type: "string" }
  }, required: ["summary", "decisions", "actionItems", "followUp"]
} as const;
export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Meeting analysis is not configured. Add OPENAI_API_KEY on the server." }, { status: 503 });
  try {
    const parsed = analyzeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid meeting details." }, { status: 400 });
    const { transcript, style, title } = parsed.data;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_ANALYSIS_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_schema", json_schema: { name: "meeting_record", strict: true, schema: outputSchema } },
      messages: [
        { role: "system", content: `You are G.H.O.S.T., a meticulous meeting analyst. Extract only facts supported by the transcript. Never invent decisions, owners, deadlines, names or commitments. If an owner or due date is unknown, use "Not specified". Distinguish a suggestion from an agreed decision. Keep summary suitable for speech and under 110 words. Write the follow-up email in this style: ${styleInstructions[style]}. If no email is warranted, provide a short neutral recap. Return only the required structured output.` },
        { role: "user", content: `Meeting title: ${title}\n\nTranscript:\n${transcript}` }
      ]
    });
    const raw = completion.choices[0]?.message.content;
    if (!raw) throw new Error("Empty analysis response");
    const data = JSON.parse(raw) as { summary: string; decisions: string[]; actionItems: { task: string; owner: string; due: string }[]; followUp: string };
    const spokenSummary = makeSpokenSummary({ summary: data.summary, decisions: data.decisions, actionItems: data.actionItems });
    return NextResponse.json({ title, ...data, spokenSummary, transcript, createdAt: new Date().toISOString() });
  } catch (error) {
    console.error("Meeting analysis failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We couldn't turn this meeting into notes. Your transcript is still available; retry analysis." }, { status: 502 });
  }
}
