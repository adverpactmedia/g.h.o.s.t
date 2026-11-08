
import { NextResponse } from "next/server";
import { analyzeSchema, styleInstructions } from "@/lib/validation";
import { makeSpokenSummary } from "@/lib/format";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const outputSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    decisions: {
      type: "array",
      items: { type: "string" },
    },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task: { type: "string" },
          owner: { type: "string" },
          due: { type: "string" },
        },
        required: ["task", "owner", "due"],
      },
    },
    followUp: { type: "string" },
  },
  required: ["summary", "decisions", "actionItems", "followUp"],
};

type AnalysisResult = {
  summary: string;
  decisions: string[];
  actionItems: {
    task: string;
    owner: string;
    due: string;
  }[];
  followUp: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export async function POST(request: Request) {
  const limit = checkRateLimit(request, "analyze", 12, 15 * 60);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many analysis requests. Please wait before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GHOST is not configured yet. Add GEMINI_API_KEY in Vercel." },
      { status: 503 }
    );
  }

  try {
    const parsed = analyzeSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            "Invalid conversation details.",
        },
        { status: 400 }
      );
    }

    const { transcript, style, title } = parsed.data;

    const systemInstructions = `
You are G.H.O.S.T., a meticulous conversation analyst.

Your job is to turn a transcript into a useful and accurate work record.

STRICT RULES:
- Extract only information supported by the transcript.
- Never invent decisions, owners, deadlines, names, or commitments.
- A suggestion is not a decision unless participants clearly agree to it.
- Do not treat a question, possibility, or proposal as an agreed action.
- If an owner is unknown, write "Not specified".
- If a due date is unknown, write "Not specified".
- If there are no confirmed decisions, return an empty decisions array.
- If there are no clear action items, return an empty actionItems array.
- Keep the summary under 110 words.
- Do not claim certainty where the transcript is ambiguous.
- The follow-up must not introduce new promises or facts.
- Write the follow-up in this style: ${styleInstructions[style]}

Return only the structured JSON requested.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructions }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Conversation title: ${title}\n\nTranscript:\n${transcript}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseJsonSchema: outputSchema,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Gemini analysis request failed.");
    }

    const result = (await response.json()) as GeminiResponse;

    const raw = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!raw) {
      throw new Error("Gemini returned an empty analysis.");
    }

    const data = JSON.parse(raw) as AnalysisResult;

    if (
      typeof data.summary !== "string" ||
      !Array.isArray(data.decisions) ||
      !Array.isArray(data.actionItems) ||
      typeof data.followUp !== "string"
    ) {
      throw new Error("Gemini returned an invalid analysis structure.");
    }

    const spokenSummary = makeSpokenSummary({
      summary: data.summary,
      decisions: data.decisions,
      actionItems: data.actionItems,
    });

    return NextResponse.json({
      title,
      ...data,
      spokenSummary,
      transcript,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "GHOST analysis error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "We couldn't create the conversation brief. Your transcript is still available. You can retry the analysis.",
      },
      { status: 502 }
    );
  }
}
