import type {
  ActionItem,
  DecisionRecord,
  EfficiencyMeter,
  FollowUpDraft,
  VerbalRevision,
  VisualEvidence,
  EvidenceReference,
} from "@/types/meeting";

export type AnalysisPayload = {
  summary: string;
  objective: string;
  friction: string;
  alignment: string;

  decisions: string[];
  actionItems: ActionItem[];

  efficiencyMeter: EfficiencyMeter;

  executiveFollowUp: FollowUpDraft;
  clientFollowUp: FollowUpDraft;
  teamFollowUp: FollowUpDraft;

  decisionRecords?: DecisionRecord[];
  revisions?: VerbalRevision[];
  correctedTranscript?: string;
  visualEvidence?: VisualEvidence[];
  detectedLanguages?: string[];
  originalLanguage?: string;
  outputLanguage?: string;
  translatedTranscript?: string;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  );
}

function isConfidence(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isEvidenceReference(
  value: unknown
): value is EvidenceReference {
  if (!isRecord(value) || typeof value.quote !== "string") {
    return false;
  }

  const numericFields = [
    "startSeconds",
    "endSeconds",
    "transcriptStart",
    "transcriptEnd",
  ];

  if (
    value.sourceId !== undefined &&
    typeof value.sourceId !== "string"
  ) {
    return false;
  }

  return numericFields.every((field) => {
    const item = value[field];

    return (
      item === undefined ||
      (typeof item === "number" &&
        Number.isFinite(item) &&
        item >= 0)
    );
  });
}

function isActionItem(value: unknown): value is ActionItem {
  if (
    !isRecord(value) ||
    typeof value.task !== "string" ||
    typeof value.owner !== "string" ||
    typeof value.due !== "string"
  ) {
    return false;
  }

  if (
    value.priority !== undefined &&
    !["urgent", "high", "normal", "low"].includes(
      String(value.priority)
    )
  ) {
    return false;
  }

  if (
    value.status !== undefined &&
    ![
      "confirmed",
      "proposed",
      "blocked",
      "completed",
      "unclear",
    ].includes(String(value.status))
  ) {
    return false;
  }

  if (
    !isOptionalString(value.dependency) ||
    !isOptionalString(value.completionCriteria) ||
    !isOptionalString(value.evidence)
  ) {
    return false;
  }

  if (
    value.confidence !== undefined &&
    !isConfidence(value.confidence)
  ) {
    return false;
  }

  return (
    value.evidenceReferences === undefined ||
    (Array.isArray(value.evidenceReferences) &&
      value.evidenceReferences.every(isEvidenceReference))
  );
}

function isDecisionRecord(
  value: unknown
): value is DecisionRecord {
  if (!isRecord(value)) return false;

  return (
    typeof value.decision === "string" &&
    ["confirmed", "tentative", "reversed", "unresolved"].includes(
      String(value.status)
    ) &&
    typeof value.rationale === "string" &&
    typeof value.evidence === "string" &&
    isConfidence(value.confidence) &&
    (value.evidenceReferences === undefined ||
      (Array.isArray(value.evidenceReferences) &&
        value.evidenceReferences.every(isEvidenceReference)))
  );
}

function isVerbalRevision(
  value: unknown
): value is VerbalRevision {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.originalText === "string" &&
    typeof value.correctedText === "string" &&
    typeof value.cue === "string" &&
    typeof value.evidence === "string" &&
    isConfidence(value.confidence) &&
    (value.status === undefined ||
      ["confirmed", "probable", "needs_review"].includes(
        String(value.status)
      )) &&
    (value.evidenceReferences === undefined ||
      (Array.isArray(value.evidenceReferences) &&
        value.evidenceReferences.every(isEvidenceReference)))
  );
}

function isVisualEvidence(
  value: unknown
): value is VisualEvidence {
  return (
    isRecord(value) &&
    typeof value.timestampSeconds === "number" &&
    Number.isFinite(value.timestampSeconds) &&
    value.timestampSeconds >= 0 &&
    typeof value.description === "string" &&
    typeof value.significance === "string" &&
    isConfidence(value.confidence) &&
    isOptionalString(value.sourceId)
  );
}

function isFollowUpDraft(
  value: unknown
): value is FollowUpDraft {
  return (
    isRecord(value) &&
    typeof value.subject === "string" &&
    typeof value.body === "string"
  );
}

function isEfficiencyMeter(
  value: unknown
): value is EfficiencyMeter {
  if (!isRecord(value)) return false;

  const velocity = value.actionableVelocityPercent;
  const noise = value.corporateNoiseFilteredPercent;

  return (
    typeof value.meetingVolume === "string" &&
    typeof velocity === "number" &&
    Number.isFinite(velocity) &&
    velocity >= 0 &&
    velocity <= 100 &&
    typeof noise === "number" &&
    Number.isFinite(noise) &&
    noise >= 0 &&
    noise <= 100 &&
    typeof value.methodology === "string"
  );
}

export function isAnalysisPayload(
  value: unknown
): value is AnalysisPayload {
  if (!isRecord(value)) return false;

  const baseValid =
    typeof value.summary === "string" &&
    typeof value.objective === "string" &&
    typeof value.friction === "string" &&
    typeof value.alignment === "string" &&
    isStringArray(value.decisions) &&
    Array.isArray(value.actionItems) &&
    value.actionItems.every(isActionItem) &&
    isEfficiencyMeter(value.efficiencyMeter) &&
    isFollowUpDraft(value.executiveFollowUp) &&
    isFollowUpDraft(value.clientFollowUp) &&
    isFollowUpDraft(value.teamFollowUp);

  if (!baseValid) return false;

  if (
    value.decisionRecords !== undefined &&
    (!Array.isArray(value.decisionRecords) ||
      !value.decisionRecords.every(isDecisionRecord))
  ) {
    return false;
  }

  if (
    value.revisions !== undefined &&
    (!Array.isArray(value.revisions) ||
      !value.revisions.every(isVerbalRevision))
  ) {
    return false;
  }

  if (
    value.visualEvidence !== undefined &&
    (!Array.isArray(value.visualEvidence) ||
      !value.visualEvidence.every(isVisualEvidence))
  ) {
    return false;
  }

  for (const field of [
    "correctedTranscript",
    "originalLanguage",
    "outputLanguage",
    "translatedTranscript",
  ]) {
    if (!isOptionalString(value[field])) return false;
  }

  if (
    value.detectedLanguages !== undefined &&
    !isStringArray(value.detectedLanguages)
  ) {
    return false;
  }

  if (
    typeof value.outputLanguage === "string" &&
    value.outputLanguage.length > 80
  ) {
    return false;
  }

  return true;
}

export function getApiError(
  value: unknown,
  fallback: string
): string {
  if (
    isRecord(value) &&
    typeof value.error === "string" &&
    value.error.trim()
  ) {
    return value.error;
  }

  return fallback;
}