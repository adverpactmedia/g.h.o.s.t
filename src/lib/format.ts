import type { MeetingResult } from "@/types/meeting";
export function makeSpokenSummary(result: Pick<MeetingResult, "summary" | "decisions" | "actionItems">) {
  const decisions = result.decisions.length ? `Decisions: ${result.decisions.join(". ")}.` : "No firm decisions were identified.";
  const actions = result.actionItems.length
    ? `Your actions: ${result.actionItems.map((item) => `${item.task}${item.due && item.due !== "Not specified" ? `, due ${item.due}` : ""}`).join(". ")}.`
    : "No clear action items were identified.";
  return `${result.summary} ${decisions} ${actions}`;
}
export function safeFilename(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "meeting";
}
