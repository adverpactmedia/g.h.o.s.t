
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
