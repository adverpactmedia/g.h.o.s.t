import type { MeetingResult } from "@/types/meeting";

const HEADERS = [
  "schema_version",
  "source_application",
  "source_version",
  "meeting_id",
  "meeting_title",
  "meeting_created_at",
  "original_language",
  "output_language",
  "meeting_summary",
  "meeting_objective",
  "meeting_friction",
  "meeting_alignment",
  "item_type",
  "item_text",
  "status",
  "priority",
  "owner",
  "due",
  "dependency",
  "completion_criteria",
  "rationale",
  "evidence",
  "confidence",
  "follow_up_subject",
  "follow_up_body",
] as const;

type CsvRow = Record<(typeof HEADERS)[number], string>;

function cell(value: unknown): string {
  let text = value === undefined || value === null ? "" : String(value);
  // Prevent spreadsheet formula execution when an export is opened in Excel/Sheets.
  if (/^\s*[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function confidence(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.round(value * 100) / 100)
    : "";
}

function meetingId(item: MeetingResult): string {
  const created = Date.parse(item.createdAt);
  const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "meeting";
  return `ghost-${Number.isFinite(created) ? created : 0}-${slug}`;
}

export function buildBlueprintCsv(item: MeetingResult): string {
  const base = {
    schema_version: "1",
    source_application: "G.H.O.S.T.",
    source_version: item.processingVersion || "unknown",
    meeting_id: meetingId(item),
    meeting_title: item.title,
    meeting_created_at: item.createdAt,
    original_language: item.originalLanguage || "",
    output_language: item.outputLanguage || "",
    meeting_summary: item.summary,
    meeting_objective: item.objective,
    meeting_friction: item.friction,
    meeting_alignment: item.alignment,
  };

  const rows: CsvRow[] = [];
  const add = (values: Partial<CsvRow>) => {
    rows.push({
      ...base,
      item_type: "",
      item_text: "",
      status: "",
      priority: "",
      owner: "",
      due: "",
      dependency: "",
      completion_criteria: "",
      rationale: "",
      evidence: "",
      confidence: "",
      follow_up_subject: "",
      follow_up_body: "",
      ...values,
    });
  };

  add({ item_type: "meeting", item_text: item.title });

  for (const decision of item.decisionRecords || []) {
    add({
      item_type: "decision",
      item_text: decision.decision,
      status: decision.status,
      rationale: decision.rationale,
      evidence: decision.evidence,
      confidence: confidence(decision.confidence),
    });
  }

  if (!item.decisionRecords?.length) {
    for (const decision of item.decisions || []) {
      add({ item_type: "decision", item_text: decision, status: "unclassified" });
    }
  }

  for (const action of item.actionItems || []) {
    add({
      item_type: "action",
      item_text: action.task,
      status: action.status || "unclassified",
      priority: action.priority || "",
      owner: action.owner,
      due: action.due,
      dependency: action.dependency || "",
      completion_criteria: action.completionCriteria || "",
      evidence: action.evidence || "",
      confidence: confidence(action.confidence),
    });
  }

  for (const revision of item.revisions || []) {
    add({
      item_type: "revision",
      item_text: revision.correctedText,
      status: revision.status || "needs_review",
      rationale: revision.cue,
      evidence: `Original wording: ${revision.originalText}. ${revision.evidence}`.trim(),
      confidence: confidence(revision.confidence),
    });
  }

  for (const [kind, draft] of [
    ["follow_up_executive", item.executiveFollowUp],
    ["follow_up_client", item.clientFollowUp],
    ["follow_up_team", item.teamFollowUp],
  ] as const) {
    add({
      item_type: kind,
      follow_up_subject: draft.subject,
      follow_up_body: draft.body,
    });
  }

  const output = [HEADERS.map(cell).join(",")];
  for (const row of rows) {
    output.push(HEADERS.map((header) => cell(row[header])).join(","));
  }
  return "\uFEFF" + output.join("\r\n") + "\r\n";
}
