
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  MAX_AUDIO_SIZE,
  normalizeAudioMimeType,
} from "@/lib/audio";

export const runtime = "nodejs";
export const maxDuration = 120;

type GeminiFile = {
  name?: string;
  uri?: string;
  mimeType?: string;
};

type GeminiInteraction = {
  id?: string;
  status?: string;
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: unknown;
};

function extractTranscript(
  interaction: GeminiInteraction
): string {
  if (typeof interaction.output_text === "string") {
    return interaction.output_text.trim();
  }

  return (interaction.steps || [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function isTrustedUploadUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "generativelanguage.googleapis.com"
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let stage = "request";
  let uploadedFileName: string | undefined;

  const limit = checkRateLimit(
    request,
    "transcribe",
    6,
    15 * 60
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Too many recordings. Please wait before trying again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfter),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "G.H.O.S.T. is not configured. Please contact the administrator.",
      },
      { status: 503 }
    );
  }

  try {
    const contentLength = Number(
      request.headers.get("content-length") || 0
    );

    if (
      contentLength > MAX_AUDIO_SIZE + 100_000
    ) {
      return NextResponse.json(
        {
          error:
            "This recording exceeds the 4 MB upload limit. Try a shorter recording.",
        },
        { status: 413 }
      );
    }

    stage = "read-upload";

    let form: FormData;

    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "The audio upload could not be read." },
        { status: 400 }
      );
    }

    const file = form.get("audio");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No audio recording was received." },
        { status: 400 }
      );
    }

    if (file.size < 1000) {
      return NextResponse.json(
        {
          error:
            "The recording is empty or too short. Record for a few seconds and try again.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        {
          error:
            "This recording exceeds the 4 MB upload limit. Use a shorter recording.",
        },
        { status: 413 }
      );
    }

    const mimeType = normalizeAudioMimeType(file.type);

    if (!mimeType) {
      return NextResponse.json(
        {
          error:
            "This browser produced an unsupported audio format. Try Chrome or import a transcript.",
        },
        { status: 415 }
      );
    }

    stage = "start-google-upload";

    const startResponse = await fetch(
      "https://generativelanguage.googleapis.com/upload/v1beta/files",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(
            file.size
          ),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: {
            display_name: `ghost-audio-${requestId}`,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!startResponse.ok) {
      console.error("GHOST transcription stage failed", {
        requestId,
        stage,
        providerStatus: startResponse.status,
      });

      throw new Error("Google could not start the audio upload.");
    }

    const uploadUrl = startResponse.headers.get(
      "x-goog-upload-url"
    );

    if (!uploadUrl || !isTrustedUploadUrl(uploadUrl)) {
      throw new Error(
        "Google did not return a valid upload destination."
      );
    }

    stage = "upload-audio";

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: new Uint8Array(await file.arrayBuffer()),
      signal: AbortSignal.timeout(30000),
    });

    if (!uploadResponse.ok) {
      console.error("GHOST transcription stage failed", {
        requestId,
        stage,
        providerStatus: uploadResponse.status,
      });

      throw new Error("Google could not receive the audio recording.");
    }

    let uploadData: { file?: GeminiFile };

    try {
      uploadData = (await uploadResponse.json()) as {
        file?: GeminiFile;
      };
    } catch {
      throw new Error("Google returned an unreadable upload response.");
    }

    const remoteFile = uploadData.file;

    if (!remoteFile?.uri || !remoteFile.name) {
      throw new Error("Google did not return a usable audio file.");
    }

    uploadedFileName = remoteFile.name;

    stage = "transcribe-audio";

    const transcriptionResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: "gemini-3.5-transcribe",
          input: [
            {
              type: "audio",
              uri: remoteFile.uri,
              mime_type: mimeType,
            },
          ],
          generation_config: {
            transcription_config: {
              mode: {
                type: "verbatim",
                diarization_mode: "speaker",
              },
            },
          },
        }),
        signal: AbortSignal.timeout(70000),
      }
    );

    if (!transcriptionResponse.ok) {
      console.error("GHOST transcription stage failed", {
        requestId,
        stage,
        providerStatus: transcriptionResponse.status,
      });

      throw new Error("Google could not transcribe the recording.");
    }

    stage = "parse-transcript";

    let interaction: GeminiInteraction;

    try {
      interaction =
        (await transcriptionResponse.json()) as GeminiInteraction;
    } catch {
      throw new Error(
        "Google returned an unreadable transcription response."
      );
    }

    const transcript = extractTranscript(interaction);

    if (!transcript) {
      console.error("GHOST transcription returned no text", {
        requestId,
        stage,
        providerStatus: interaction.status || "unknown",
      });

      throw new Error(
        "No speech was detected. Try recording again in a quieter environment."
      );
    }

    console.info("GHOST transcription completed", {
      requestId,
      stage: "completed",
      audioBytes: file.size,
      mimeType,
      transcriptCharacters: transcript.length,
    });

    return NextResponse.json(
      { transcript },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GHOST transcription request failed", {
      requestId,
      stage,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

    const message =
      error instanceof Error
        ? error.message
        : "Transcription failed.";

    return NextResponse.json(
      {
        error: message,
        requestId,
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } finally {
    if (uploadedFileName) {
      try {
        const deleteResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${uploadedFileName}`,
          {
            method: "DELETE",
            headers: {
              "x-goog-api-key": apiKey,
            },
            signal: AbortSignal.timeout(7000),
          }
        );

        if (!deleteResponse.ok) {
          console.error(
            "GHOST temporary audio cleanup failed",
            {
              requestId,
              providerStatus: deleteResponse.status,
            }
          );
        }
      } catch {
        console.error(
          "GHOST temporary audio cleanup request failed",
          { requestId }
        );
      }
    }
  }
}
