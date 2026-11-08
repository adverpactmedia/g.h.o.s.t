
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_AUDIO_SIZE = 4 * 1024 * 1024;

type GeminiFile = {
  name?: string;
  uri?: string;
  mimeType?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export async function POST(request: Request) {
  const limit = checkRateLimit(request, "transcribe", 6, 15 * 60);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many recordings. Please wait before trying again." },
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

  let uploadedFileName: string | undefined;

  try {
    const form = await request.formData();
    const file = form.get("audio");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No audio recording was received." },
        { status: 400 }
      );
    }

    if (file.size < 1000) {
      return NextResponse.json(
        { error: "The recording is too short or empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        {
          error:
            "This recording exceeds the 4 MB upload limit. Use a shorter recording or import a transcript.",
        },
        { status: 413 }
      );
    }

    const mimeType = (file.type || "audio/webm").split(";")[0];

    const supportedTypes = [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/aac",
      "audio/flac",
    ];

    if (!supportedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: "This audio format is not supported." },
        { status: 415 }
      );
    }

    // Start a resumable upload to Gemini Files API.
    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(file.size),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: { display_name: "ghost-conversation-audio" },
        }),
      }
    );

    if (!startResponse.ok) {
      throw new Error("Gemini could not start the audio upload.");
    }

    const uploadUrl = startResponse.headers.get("x-goog-upload-url");

    if (!uploadUrl) {
      throw new Error("Gemini did not return an upload destination.");
    }

    // Upload the audio bytes.
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: new Uint8Array(await file.arrayBuffer()),
    });

    if (!uploadResponse.ok) {
      throw new Error("The audio upload failed.");
    }

    const uploadData = (await uploadResponse.json()) as {
      file?: GeminiFile;
    };

    const remoteFile = uploadData.file;

    if (!remoteFile?.uri || !remoteFile.name) {
      throw new Error("Gemini did not return a usable audio file.");
    }

    uploadedFileName = remoteFile.name;

    // Ask Gemini for a verbatim transcript with speaker separation.
    const transcriptionResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  fileData: {
                    mimeType,
                    fileUri: remoteFile.uri,
                  },
                },
                {
                  text:
                    "Transcribe this conversation accurately and verbatim. Preserve the actual words spoken. Do not summarize, rewrite, infer missing words, or invent speaker identities. Use speaker labels where the audio model provides them.",
                },
              ],
            },
          ],
          generationConfig: {
            audioTranscriptionConfig: {
              mode: "VERBATIM",
              diarization: true,
            },
          },
        }),
      }
    );

    if (!transcriptionResponse.ok) {
      throw new Error("Gemini transcription failed.");
    }

    const result =
      (await transcriptionResponse.json()) as GeminiResponse;

    const transcript = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!transcript) {
      throw new Error("Gemini returned an empty transcript.");
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error(
      "GHOST transcription error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "We couldn't transcribe that recording. Try again or paste a transcript instead.",
      },
      { status: 502 }
    );
  } finally {
    // Delete the temporary Gemini upload after processing.
    if (uploadedFileName) {
      try {
        await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${uploadedFileName}?key=${encodeURIComponent(apiKey)}`,
          { method: "DELETE" }
        );
      } catch {
        console.error("GHOST could not delete the temporary Gemini file.");
      }
    }
  }
}
