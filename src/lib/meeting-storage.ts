
import { isMeetingResult, type MeetingResult } from "@/types/meeting";

export function loadMeetingHistory(raw: string | null): MeetingResult[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isMeetingResult);
  } catch {
    return [];
  }
}

export function serializeMeetingHistory(
  meetings: MeetingResult[]
): string {
  return JSON.stringify(meetings);
}
