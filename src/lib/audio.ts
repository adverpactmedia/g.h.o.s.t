
export const MAX_AUDIO_SIZE = 4 * 1024 * 1024;

const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/wav",
  "audio/mp3",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/mpeg",
  "audio/m4a",
  "audio/l16",
  "audio/opus",
  "audio/alaw",
  "audio/mulaw",
  "audio/webm",
]);

export function normalizeAudioMimeType(
  input: string | null | undefined
): string | null {
  const baseType = (input || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  const aliases: Record<string, string> = {
    "audio/mp4": "audio/m4a",
    "audio/x-m4a": "audio/m4a",
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
    "audio/x-aiff": "audio/aiff",
    "audio/x-flac": "audio/flac",
  };

  const normalized = aliases[baseType] || baseType;

  return SUPPORTED_AUDIO_TYPES.has(normalized)
    ? normalized
    : null;
}

export function getAudioFileExtension(
  input: string | null | undefined
): string {
  const mimeType = normalizeAudioMimeType(input);

  const extensions: Record<string, string> = {
    "audio/wav": "wav",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/aiff": "aiff",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/m4a": "m4a",
    "audio/l16": "l16",
    "audio/opus": "opus",
    "audio/alaw": "alaw",
    "audio/mulaw": "mulaw",
    "audio/webm": "webm",
  };

  return mimeType ? extensions[mimeType] || "audio" : "audio";
}
