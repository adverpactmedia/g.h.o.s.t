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
      { error: "G.H.O.S.T. is not configured. Add GEMINI_API_KEY in Vercel." },
      { status: 503 }
    );
  }

  let uploadedFileName: string | undefined;

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > MAX_AUDIO_SIZE + 100_000) {
      return NextResponse.json(
        { error: "This recording exceeds the 4 MB upload limit." },
        { status: 413 }
      );
    }

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

    const mimeType = (file.type || "audio/webm").split(";")[0].toLowerCase();

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
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!startResponse.ok) {
      throw new Error("Gemini could not start the audio upload.");
    }

    const uploadUrl = startResponse.headers.get("x-goog-upload-url");

    if (!uploadUrl) {
      throw new Error("Gemini did not return an upload destination.");
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: new Uint8Array(await file.arrayBuffer()),
      signal: AbortSignal.timeout(25000),
    });

    if (!uploadResponse.ok) {
      throw new Error("The audio upload failed.");
    }

    let uploadData: { file?: GeminiFile };

    try {
      uploadData = (await uploadResponse.json()) as {
        file?: GeminiFile;
      };
    } catch {
      throw new Error("Gemini returned an unreadable upload response.");
    }

    const remoteFile = uploadData.file;

    if (!remoteFile?.uri || !remoteFile.name) {
      throw new Error("Gemini did not return a usable audio file.");
    }

    uploadedFileName = remoteFile.name;

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
        signal: AbortSignal.timeout(70000),
      }
    );

    if (!transcriptionResponse.ok) {
      const providerError = await transcriptionResponse.text();

      console.error(
        "GHOST transcription provider error:",
        transcriptionResponse.status,
        providerError.slice(0, 1000)
      );

      throw new Error("Gemini transcription failed.");
    }

    let result: GeminiResponse;

    try {
      result = (await transcriptionResponse.json()) as GeminiResponse;
    } catch {
      throw new Error("Gemini returned an unreadable transcription response.");
    }

    const transcript = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!transcript) {
      throw new Error("Gemini returned an empty transcript.");
    }

    return NextResponse.json(
      { transcript },
      { headers: { "Cache-Control": "no-store" } }
    );
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
    if (uploadedFileName) {
      try {
        const deleteResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${uploadedFileName}?key=${encodeURIComponent(apiKey)}`,
          {
            method: "DELETE",
            signal: AbortSignal.timeout(5000),
          }
        );

        if (!deleteResponse.ok) {
          console.error(
            "GHOST temporary Gemini file deletion failed:",
            deleteResponse.status
          );
        }
      } catch {
        console.error("GHOST could not delete the temporary Gemini file.");
      }
    }
  }
}