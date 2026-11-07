import OpenAI from "openai";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Transcription is not configured. Add OPENAI_API_KEY on the server." }, { status: 503 });
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) return NextResponse.json({ error: "No audio recording was received." }, { status: 400 });
    if (file.size < 1000) return NextResponse.json({ error: "The recording is too short or empty." }, { status: 400 });
    if (file.size > 24 * 1024 * 1024) return NextResponse.json({ error: "This recording exceeds the 24 MB limit. Use a shorter meeting or split the recording." }, { status: 413 });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcript = await client.audio.transcriptions.create({
      file: new File([await file.arrayBuffer()], file.name || "meeting.webm", { type: file.type || "audio/webm" }),
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
      response_format: "text",
    });
    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Transcription failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We couldn't transcribe that recording. Try again or paste a transcript instead." }, { status: 502 });
  }
}
