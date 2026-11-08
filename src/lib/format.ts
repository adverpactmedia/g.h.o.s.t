import type { MeetingResult } from "@/types/meeting";

function cleanSentence(value: string): string {
  return value.trim().replace(/[.!?]+$/, "");
}

export function makeSpokenSummary(
  result: Pick<MeetingResult, "summary" | "decisions" | "actionItems">
) {
  const summary = cleanSentence(result.summary);

  const decisions = result.decisions.length
    ? `Decisions: ${result.decisions
        .map(cleanSentence)
        .filter(Boolean)
        .join(". ")}.`
    : "No firm decisions were identified.";

  const actions = result.actionItems.length
    ? `Action items: ${result.actionItems
        .map((item) => {
          const task = cleanSentence(item.task);
          const owner =
            item.owner && item.owner !== "Unassigned"
              ? `, assigned to ${item.owner}`
              : "";
          const due =
            item.due && item.due !== "TBD" && item.due !== "Not specified"
              ? `, due ${item.due}`
              : "";

          return `${task}${owner}${due}`;
        })
        .filter(Boolean)
        .join(". ")}.`
    : "No clear action items were identified.";

  return [summary, decisions, actions].filter(Boolean).join(" ");
}

export function safeFilename(title: string) {
  const cleaned = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");

  return cleaned || "meeting";
}