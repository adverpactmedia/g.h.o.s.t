
export type VoiceStyle =
  | "direct"
  | "warm"
  | "executive"
  | "casual";

export type MeetingSourceType =
  | "microphone"
  | "browser_tab"
  | "native_microphone"
  | "native_system_audio"
  | "audio_upload"
  | "video_upload"
  | "transcript_upload"
  | "zoom"
  | "google_meet"
  | "microsoft_teams"
  | "other";

export type MeetingMediaType = "audio" | "video" | "text";

export type MeetingSource = {
  id: string;
  type: MeetingSourceType;
  mediaType: MeetingMediaType;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  durationSeconds?: number;
  language?: string;
  uploadedAt?: string;
  processingStatus?:
    | "pending"
    | "uploading"
    | "processing"
    | "completed"
    | "failed";
};

export type EvidenceReference = {
  sourceId?: string;
  startSeconds?: number;
  endSeconds?: number;
  transcriptStart?: number;
  transcriptEnd?: number;
  quote: string;
};

export type ActionPriority =
  | "urgent"
  | "high"
  | "normal"
  | "low";

export type ActionStatus =
  | "confirmed"
  | "proposed"
  | "blocked"
  | "completed"
  | "unclear";

export type ActionItem = {
  task: string;
  owner: string;
  due: string;

  priority?: ActionPriority;
  status?: ActionStatus;
  dependency?: string;
  completionCriteria?: string;
  evidence?: string;
  confidence?: number;
  evidenceReferences?: EvidenceReference[];
};

export type DecisionStatus =
  | "confirmed"
  | "tentative"
  | "reversed"
  | "unresolved";

export type DecisionRecord = {
  decision: string;
  status: DecisionStatus;
  rationale: string;
  evidence: string;
  confidence: number;
  evidenceReferences?: EvidenceReference[];
};

export type RevisionStatus =
  | "confirmed"
  | "probable"
  | "needs_review";

export type VerbalRevision = {
  id: string;
  originalText: string;
  correctedText: string;
  cue: string;
  evidence: string;
  confidence: number;
  status?: RevisionStatus;
  evidenceReferences?: EvidenceReference[];
};

export type TranscriptSegment = {
  id: string;
  text: string;
  speaker?: string;
  language?: string;
  startSeconds?: number;
  endSeconds?: number;
  sourceId?: string;
};

export type VisualEvidence = {
  timestampSeconds: number;
  description: string;
  significance: string;
  confidence: number;
  sourceId?: string;
};

export type EfficiencyMeter = {
  meetingVolume: string;
  actionableVelocityPercent: number;
  corporateNoiseFilteredPercent: number;
  methodology: string;
};

export type FollowUpDraft = {
  subject: string;
  body: string;
};

export type MeetingResult = {
  title: string;
  summary: string;
  objective: string;
  friction: string;
  alignment: string;
  spokenSummary: string;

  decisions: string[];
  actionItems: ActionItem[];

  efficiencyMeter: EfficiencyMeter;

  executiveFollowUp: FollowUpDraft;
  clientFollowUp: FollowUpDraft;
  teamFollowUp: FollowUpDraft;

  followUp: string;
  transcript: string;
  createdAt: string;

  // Expanded meeting intelligence.
  decisionRecords?: DecisionRecord[];
  revisions?: VerbalRevision[];
  correctedTranscript?: string;

  // Source and multilingual information.
  sources?: MeetingSource[];
  transcriptSegments?: TranscriptSegment[];
  originalLanguage?: string;
  outputLanguage?: string;
  detectedLanguages?: string[];
  translatedTranscript?: string;

  // Visual meeting evidence.
  visualEvidence?: VisualEvidence[];

  // Indicates how the Blueprint was produced.
  processingVersion?: string;
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

function isOptionalString(
  value: unknown
): boolean {
  return value === undefined || typeof value === "string";
}

function isEvidenceReference(
  value: unknown
): value is EvidenceReference {
  if (!isRecord(value) || typeof value.quote !== "string") {
    return false;
  }

  for (const field of [
    "sourceId",
    "startSeconds",
    "endSeconds",
    "transcriptStart",
    "transcriptEnd",
  ]) {
    if (
      value[field] !== undefined &&
      (typeof value[field] !==
        (field === "sourceId" ? "string" : "number") ||
        (typeof value[field] === "number" &&
          (!Number.isFinite(value[field]) ||
            value[field] < 0)))
    ) {
      return false;
    }
  }

  return true;
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

  const priorities = ["urgent", "high", "normal", "low"];
  const statuses = [
    "confirmed",
    "proposed",
    "blocked",
    "completed",
    "unclear",
  ];

  if (
    value.priority !== undefined &&
    !priorities.includes(String(value.priority))
  ) {
    return false;
  }

  if (
    value.status !== undefined &&
    !statuses.includes(String(value.status))
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

function isMeetingSource(value: unknown): value is MeetingSource {
  if (!isRecord(value)) return false;

  const sourceTypes = [
    "microphone",
    "browser_tab",
    "native_microphone",
    "native_system_audio",
    "audio_upload",
    "video_upload",
    "transcript_upload",
    "zoom",
    "google_meet",
    "microsoft_teams",
    "other",
  ];

  const mediaTypes = ["audio", "video", "text"];

  const statuses = [
    "pending",
    "uploading",
    "processing",
    "completed",
    "failed",
  ];

  return (
    typeof value.id === "string" &&
    sourceTypes.includes(String(value.type)) &&
    mediaTypes.includes(String(value.mediaType)) &&
    typeof value.name === "string" &&
    typeof value.mimeType === "string" &&
    (value.sizeBytes === undefined ||
      (typeof value.sizeBytes === "number" &&
        Number.isFinite(value.sizeBytes) &&
        value.sizeBytes >= 0)) &&
    (value.durationSeconds === undefined ||
      (typeof value.durationSeconds === "number" &&
        Number.isFinite(value.durationSeconds) &&
        value.durationSeconds >= 0)) &&
    isOptionalString(value.language) &&
    isOptionalString(value.uploadedAt) &&
    (value.processingStatus === undefined ||
      statuses.includes(String(value.processingStatus)))
  );
}

function isTranscriptSegment(
  value: unknown
): value is TranscriptSegment {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    isOptionalString(value.speaker) &&
    isOptionalString(value.language) &&
    (value.startSeconds === undefined ||
      (typeof value.startSeconds === "number" &&
        Number.isFinite(value.startSeconds) &&
        value.startSeconds >= 0)) &&
    (value.endSeconds === undefined ||
      (typeof value.endSeconds === "number" &&
        Number.isFinite(value.endSeconds) &&
        value.endSeconds >= 0)) &&
    isOptionalString(value.sourceId)
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

export function isMeetingResult(
  value: unknown
): value is MeetingResult {
  if (!isRecord(value)) return false;

  const baseValid =
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    typeof value.objective === "string" &&
    typeof value.friction === "string" &&
    typeof value.alignment === "string" &&
    typeof value.spokenSummary === "string" &&
    isStringArray(value.decisions) &&
    Array.isArray(value.actionItems) &&
    value.actionItems.every(isActionItem) &&
    isEfficiencyMeter(value.efficiencyMeter) &&
    isFollowUpDraft(value.executiveFollowUp) &&
    isFollowUpDraft(value.clientFollowUp) &&
    isFollowUpDraft(value.teamFollowUp) &&
    typeof value.followUp === "string" &&
    typeof value.transcript === "string" &&
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt));

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
    value.sources !== undefined &&
    (!Array.isArray(value.sources) ||
      !value.sources.every(isMeetingSource))
  ) {
    return false;
  }

  if (
    value.transcriptSegments !== undefined &&
    (!Array.isArray(value.transcriptSegments) ||
      !value.transcriptSegments.every(isTranscriptSegment))
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
    "processingVersion",
  ]) {
    if (!isOptionalString(value[field])) return false;
  }

  return (
    value.detectedLanguages === undefined ||
    isStringArray(value.detectedLanguages)
  );
}
