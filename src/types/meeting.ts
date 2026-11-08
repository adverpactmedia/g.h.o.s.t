export type ActionItem = {
  task: string;
  owner: string;
  due: string;
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
};

export type VoiceStyle =
  | "direct"
  | "warm"
  | "executive"
  | "casual";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isActionItem(value: unknown): value is ActionItem {
  return (
    isRecord(value) &&
    typeof value.task === "string" &&
    typeof value.owner === "string" &&
    typeof value.due === "string"
  );
}

function isFollowUpDraft(value: unknown): value is FollowUpDraft {
  return (
    isRecord(value) &&
    typeof value.subject === "string" &&
    typeof value.body === "string"
  );
}

function isEfficiencyMeter(value: unknown): value is EfficiencyMeter {
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

export function isMeetingResult(value: unknown): value is MeetingResult {
  if (!isRecord(value)) return false;

  return (
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
    !Number.isNaN(Date.parse(value.createdAt))
  );
}