import type { MeetingResult } from "@/types/meeting";

function timestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function confidence(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not provided";
  }
  return `${Math.round(value * 100)}%`;
}

export function buildBlueprintMarkdown(
  item: MeetingResult,
  includeTranscript = false
): string {
  const lines: string[] = [
    "# G.H.O.S.T. Meeting Blueprint",
    "",
    `# ${item.title}`,
    "",
    `Created: ${new Date(item.createdAt).toLocaleString()}`,
    "",
    "## Meeting Summary",
    item.summary,
    "",
    "## Objective",
    item.objective,
    "",
    "## Friction",
    item.friction,
    "",
    "## Alignment",
    item.alignment,
    "",
    "## Decision Register",
  ];

  if (item.decisionRecords?.length) {
    for (const decision of item.decisionRecords) {
      lines.push(
        `### ${decision.status.toUpperCase()}: ${decision.decision}`,
        "",
        `- Rationale: ${decision.rationale || "Not provided"}`,
        `- Evidence: ${decision.evidence || "Not provided"}`,
        `- Confidence: ${confidence(decision.confidence)}`,
        ""
      );
    }
  } else if (item.decisions.length) {
    lines.push(
      ...item.decisions.map((decision) => `- ${decision}`),
      ""
    );
  } else {
    lines.push("- No decisions identified.", "");
  }

  lines.push("## Action Register", "");

  if (item.actionItems.length) {
    for (const action of item.actionItems) {
      lines.push(
        `### ${action.task}`,
        "",
        `- Status: ${action.status ?? "Not classified"}`,
        `- Priority: ${action.priority ?? "Not classified"}`,
        `- Owner: ${action.owner}`,
        `- Due: ${action.due}`,
        `- Dependency: ${action.dependency || "None identified"}`,
        `- Completion criteria: ${action.completionCriteria || "Not specified"}`,
        `- Evidence: ${action.evidence || "Not provided"}`,
        `- Confidence: ${confidence(action.confidence)}`,
        ""
      );
    }
  } else {
    lines.push("- No clear action items identified.", "");
  }

  lines.push("## Verbal Corrections", "");

  if (item.revisions?.length) {
    for (const revision of item.revisions) {
      lines.push(
        `- ~~${revision.originalText}~~ → **${revision.correctedText}**`,
        `  - Status: ${revision.status ?? "Not classified"}`,
        `  - Correction cue: ${revision.cue}`,
        `  - Evidence: ${revision.evidence}`,
        `  - Confidence: ${confidence(revision.confidence)}`,
        ""
      );
    }
  } else {
    lines.push("- No verbal corrections identified.", "");
  }

  lines.push(
    "## Efficiency Meter",
    "",
    `- Transcript volume: ${item.efficiencyMeter.meetingVolume}`,
    `- Estimated actionable velocity: ${item.efficiencyMeter.actionableVelocityPercent}%`,
    `- Estimated non-actionable content: ${item.efficiencyMeter.corporateNoiseFilteredPercent}%`,
    "",
    item.efficiencyMeter.methodology,
    "",
    "## Executive Follow-up",
    "",
    `Subject: ${item.executiveFollowUp.subject}`,
    "",
    item.executiveFollowUp.body,
    "",
    "## Client Follow-up",
    "",
    `Subject: ${item.clientFollowUp.subject}`,
    "",
    item.clientFollowUp.body,
    "",
    "## Team Follow-up",
    "",
    `Subject: ${item.teamFollowUp.subject}`,
    "",
    item.teamFollowUp.body,
    ""
  );

  if (item.visualEvidence?.length) {
    lines.push("## Visual Evidence", "");

    for (const evidence of item.visualEvidence) {
      lines.push(
        `### ${timestamp(evidence.timestampSeconds)}`,
        "",
        evidence.description,
        "",
        `- Significance: ${evidence.significance}`,
        `- Confidence: ${confidence(evidence.confidence)}`,
        ""
      );
    }
  }

  if (item.originalLanguage || item.detectedLanguages?.length || item.outputLanguage) {
    lines.push(
      "## Language Information",
      "",
      `- Original language: ${item.originalLanguage || "Not identified"}`,
      `- Detected languages: ${item.detectedLanguages?.join(", ") || "Not identified"}`,
      `- Output language: ${item.outputLanguage || "Not specified"}`,
      ""
    );
  }

  if (includeTranscript) {
    lines.push(
      "---",
      "",
      "## Original Transcript",
      "",
      item.transcript,
      ""
    );

    if (item.correctedTranscript) {
      lines.push(
        "## Corrected Transcript",
        "",
        item.correctedTranscript,
        ""
      );
    }

    if (item.translatedTranscript) {
      lines.push(
        "## Translated Transcript",
        "",
        `Translated into: ${item.outputLanguage || "the selected output language"}`,
        "",
        item.translatedTranscript,
        ""
      );
    }
  }

  lines.push(
    "---",
    "",
    "G.H.O.S.T. AI-generated output. Verify decisions, corrections, evidence and assigned actions against the original conversation."
  );

  return lines.join("\n");
}