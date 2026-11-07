export type ActionItem = { task: string; owner: string; due: string };
export type MeetingResult = {
  title: string;
  summary: string;
  spokenSummary: string;
  decisions: string[];
  actionItems: ActionItem[];
  followUp: string;
  transcript: string;
  createdAt: string;
};
export type VoiceStyle = "direct" | "warm" | "executive" | "casual";
