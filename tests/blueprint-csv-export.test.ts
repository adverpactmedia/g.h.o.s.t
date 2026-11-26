import { describe, expect, it } from "vitest";
import { buildBlueprintCsv } from "../src/lib/blueprint-csv-export";
import type { MeetingResult } from "../src/types/meeting";

const meeting: MeetingResult = {
  title: "Q4, launch review",
  summary: "Launch moves to Friday.",
  objective: "Confirm launch readiness.",
  friction: "Copy is not final.",
  alignment: "Team agrees on Friday.",
  spokenSummary: "Launch moves to Friday.",
  decisions: ["Ship the revised page"],
  actionItems: [
    {
      task: "Send final copy, then notify the team",
      owner: "Mia",
      due: "Friday",
      status: "confirmed",
      priority: "high",
      dependency: "Legal approval",
      completionCriteria: "Final copy approved",
      evidence: "Mia confirmed the task",
      confidence: 0.92,
    },
  ],
  efficiencyMeter: {
    meetingVolume: "12 minutes",
    actionableVelocityPercent: 40,
    corporateNoiseFilteredPercent: 60,
    methodology: "Based on transcript segments.",
  },
  executiveFollowUp: { subject: "Executive recap", body: "The launch is Friday." },
  clientFollowUp: { subject: "Client update", body: "We are on track." },
  teamFollowUp: { subject: "Team actions", body: "Mia owns final copy." },
  followUp: "Send the recap.",
  transcript: "Private transcript omitted from CSV.",
  createdAt: "2026-11-25T12:00:00.000Z",
  processingVersion: "v1",
  decisionRecords: [
    {
      decision: "Ship revised page",
      status: "confirmed",
      rationale: "QA is complete",
      evidence: "The owner confirmed",
      confidence: 0.98,
    },
  ],
  revisions: [
    {
      id: "r1",
      originalText: "Thursday",
      correctedText: "Friday",
      cue: "Speaker corrected the date",
      evidence: "No ambiguity",
      confidence: 0.99,
      status: "confirmed",
    },
  ],
};

describe("G.H.O.S.T. structured CSV export", () => {
  it("exports stable meeting, decision, action, revision and follow-up rows", () => {
    const csv = buildBlueprintCsv(meeting);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"schema_version"');
    expect(csv).toContain('"source_application"');
    expect(csv).toContain('"ghost-1795608000000-q4-launch-review"');
    expect(csv).toContain('"decision"');
    expect(csv).toContain('"action"');
    expect(csv).toContain('"revision"');
    expect(csv).toContain('"follow_up_executive"');
    expect(csv).toContain('"Mia"');
    expect(csv).toContain('"Friday"');
    expect(csv).not.toContain("Private transcript omitted from CSV.");
  });

  it("quotes commas, quotes and newlines as RFC 4180 CSV fields", () => {
    const csv = buildBlueprintCsv(meeting);
    expect(csv).toContain('"Q4, launch review"');
    expect(csv).toContain('"Send final copy, then notify the team"');
    expect(csv).toContain('"Ship revised page"');
  });

  it("neutralizes spreadsheet formula-leading untrusted content", () => {
    const hostile = {
      ...meeting,
      title: "=HYPERLINK(\"https://bad.example\")",
      actionItems: [{ ...meeting.actionItems[0], task: "@SUM(1,2)" }],
    };
    const csv = buildBlueprintCsv(hostile);
    expect(csv).toContain('"\'=HYPERLINK(""https://bad.example"")"');
    expect(csv).toContain('"'@SUM(1,2)"');
  });
});
