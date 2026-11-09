
import { NextResponse } from "next/server";
import {
  analyzeSchema,
  type AnalysisStyle,
} from "@/lib/validation";
import { buildAnalysisPrompt } from "@/lib/analysis-prompt";
import { isAnalysisPayload } from "@/lib/analysis-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-3.8-flash";
const API =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

type Interaction = {
  id?: string;
  status?: string;
  error?: unknown;
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function extractOutput(interaction: Interaction): string {
  if (typeof interaction.output_text === "string") {
    return interaction.output_text.trim();
  }

  return (interaction.steps || [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("")
    .trim();
}

function parseModelJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(cleaned);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getApiKey(): string | null {
  const value = process.env.GEMINI_API_KEY?.trim();
  return value || null;
}

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
  };
}

export async function POST(request: Request) {
  const limit = checkRateLimit(
    request,
    "analyze",
    12,
    15 * 60
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many analysis requests. Please wait before trying again.",
      },
      {
        status: 429,
        headers: {
          ...noStoreHeaders(),
          "Retry-After": String(limit.retryAfter),
        },
      }
    );
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "G.H.O.S.T. is not configured. Add GEMINI_API_KEY in Vercel.",
      },
      {
        status: 503,
        headers: noStoreHeaders(),
      }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body must contain valid JSON." },
      {
        status: 400,
        headers: noStoreHeaders(),
      }
    );
  }

  const parsed = analyzeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "The meeting transcript is invalid.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      }
    );
  }

  try {
    const {
      transcript,
      title,
      style,
      outputLanguage,
    } = parsed.data;

    const prompt = buildAnalysisPrompt({
      transcript,
      title,
      style: style as AnalysisStyle,
      outputLanguage,
    });

    const response = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "Api-Revision": "2026-05-20",
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        background: true,
        store: true,
      }),
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });

    if (!response.ok) {
      const providerBody = await response.text();

      console.error("GHOST analysis creation failed:", {
        providerStatus: response.status,
        providerMessage: providerBody.slice(0, 1200),
      });

      return NextResponse.json(
        {
          error: `Gemini could not start the analysis (HTTP ${response.status}).`,
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    let interaction: Interaction;

    try {
      interaction = (await response.json()) as Interaction;
    } catch {
      console.error(
        "GHOST received invalid JSON when starting analysis."
      );

      return NextResponse.json(
        { error: "Gemini returned an unreadable response." },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    if (
      typeof interaction.id !== "string" ||
      !/^[A-Za-z0-9_-]{6,200}$/.test(interaction.id)
    ) {
      console.error(
        "GHOST analysis creation returned an invalid interaction ID."
      );

      return NextResponse.json(
        { error: "Gemini did not return a valid analysis task ID." },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    return NextResponse.json(
      {
        interactionId: interaction.id,
        status: interaction.status || "in_progress",
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("GHOST analysis start error:", error);

    return NextResponse.json(
      {
        error:
          "G.H.O.S.T. could not start the analysis. Please retry.",
      },
      {
        status: 502,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function GET(request: Request) {
  const limit = checkRateLimit(
    request,
    "analyze-poll",
    180,
    15 * 60
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many status checks. Please wait before trying again.",
      },
      {
        status: 429,
        headers: {
          ...noStoreHeaders(),
          "Retry-After": String(limit.retryAfter),
        },
      }
    );
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: "G.H.O.S.T. is not configured." },
      {
        status: 503,
        headers: noStoreHeaders(),
      }
    );
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id || !/^[A-Za-z0-9_-]{6,200}$/.test(id)) {
    return NextResponse.json(
      { error: "A valid analysis task ID is required." },
      {
        status: 400,
        headers: noStoreHeaders(),
      }
    );
  }

  try {
    const response = await fetch(
      `${API}/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          "x-goog-api-key": apiKey,
          "Api-Revision": "2026-05-20",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      const providerBody = await response.text();

      console.error("GHOST analysis polling failed:", {
        providerStatus: response.status,
        providerMessage: providerBody.slice(0, 1000),
      });

      return NextResponse.json(
        {
          error: `Could not check analysis status (HTTP ${response.status}).`,
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    let interaction: Interaction;

    try {
      interaction = (await response.json()) as Interaction;
    } catch {
      console.error(
        "GHOST received invalid JSON while checking analysis."
      );

      return NextResponse.json(
        { error: "Gemini returned an unreadable status response." },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    if (
      interaction.status === "in_progress" ||
      interaction.status === "queued"
    ) {
      return NextResponse.json(
        { status: "processing" },
        {
          headers: noStoreHeaders(),
        }
      );
    }

    if (interaction.status !== "completed") {
      console.error("GHOST interaction ended unsuccessfully:", {
        status: interaction.status,
        error: isRecord(interaction.error)
          ? interaction.error
          : undefined,
      });

      return NextResponse.json(
        {
          status: "failed",
          error:
            "Gemini could not complete the analysis. Your transcript is still available.",
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    const raw = extractOutput(interaction);

    if (!raw) {
      console.error(
        "GHOST completed interaction had no text output."
      );

      return NextResponse.json(
        {
          error:
            "Gemini completed the task but returned no usable Blueprint.",
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    let analysis: unknown;

    try {
      analysis = parseModelJson(raw);
    } catch {
      console.error(
        "GHOST returned invalid analysis JSON:",
        raw.slice(0, 1200)
      );

      return NextResponse.json(
        {
          error:
            "Gemini returned an unreadable Blueprint. Please retry.",
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    if (!isAnalysisPayload(analysis)) {
      console.error(
        "GHOST returned an incomplete or invalid Blueprint."
      );

      return NextResponse.json(
        {
          error:
            "Gemini returned an incomplete Blueprint. Please retry.",
        },
        {
          status: 502,
          headers: noStoreHeaders(),
        }
      );
    }

    return NextResponse.json(
      {
        status: "completed",
        analysis,
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("GHOST analysis status error:", error);

    return NextResponse.json(
      {
        error:
          "Could not retrieve the completed Blueprint. Your transcript is still available.",
      },
      {
        status: 502,
        headers: noStoreHeaders(),
      }
    );
  }
}
