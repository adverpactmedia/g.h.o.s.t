
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

  // Core summary
  summary: string;
  objective: string;
  friction: string;
  alignment: string;
  spokenSummary: string;

  // Decisions and execution
  decisions: string[];
  actionItems: ActionItem[];

  // Estimated meeting efficiency
  efficiencyMeter: EfficiencyMeter;

  // Separate communication drafts
  executiveFollowUp: FollowUpDraft;
  clientFollowUp: FollowUpDraft;

  // Backward-compatible field for the existing interface
  followUp: string;

  // Source material and metadata
  transcript: string;
  createdAt: string;
};

export type VoiceStyle =
  | "direct"
  | "warm"
  | "executive"
  | "casual";
