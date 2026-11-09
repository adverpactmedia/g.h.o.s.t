"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Languages,
  Link2,
  ShieldAlert,
  Video,
} from "lucide-react";
import type {
  MeetingResult,
  VerbalRevision,
} from "@/types/meeting";
import { buildRevisionDisplay } from "@/lib/revision-engine";

type Props = {
  meeting: MeetingResult;
};

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(
    remaining
  ).padStart(2, "0")}`;
}

function statusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function Evidence({
  quote,
  confidence,
}: {
  quote?: string;
  confidence?: number;
}) {
  if (!quote && confidence === undefined) return null;

  return (
    <div className="ghost-evidence">
      {quote && <blockquote>“{quote}”</blockquote>}
      {confidence !== undefined && (
        <small>Extraction confidence: {percent(confidence)}</small>
      )}
    </div>
  );
}

function RevisionPanel({
  transcript,
  revisions,
}: {
  transcript: string;
  revisions: VerbalRevision[];
}) {
  const display = useMemo(
    () => buildRevisionDisplay(transcript, revisions),
    [transcript, revisions]
  );

  if (!revisions.length) {
    return (
      <p className="ghost-muted">
        No clear verbal corrections were identified.
      </p>
    );
  }

  return (
    <div className="ghost-revisions">
      <div className="ghost-revision-legend">
        <span className="ghost-old">Superseded wording</span>
        <span className="ghost-new">Corrected wording</span>
      </div>

      <p className="ghost-corrected-transcript">
        {display.segments.map((segment, index) => {
          if (segment.kind === "superseded") {
            return (
              <del
                className="ghost-superseded"
                key={`${segment.revisionId}-${index}`}
                title="Original wording later corrected"
              >
                {segment.text}
              </del>
            );
          }

          if (segment.kind === "replacement") {
            return (
              <ins
                className="ghost-replacement"
                key={`${segment.revisionId}-${index}`}
                title="Replacement wording"
              >
                {segment.text}
              </ins>
            );
          }

          return (
            <span key={`normal-${index}`}>{segment.text}</span>
          );
        })}
      </p>

      {revisions.map((revision) => (
        <div className="ghost-revision-card" key={revision.id}>
          <div className="ghost-intel-heading">
            <b>{statusLabel(revision.status || "needs_review")}</b>
            <span>{percent(revision.confidence)}</span>
          </div>

          <p>
            <del className="ghost-superseded">
              {revision.originalText}
            </del>
          </p>

          <p>
            <ins className="ghost-replacement">
              {revision.correctedText}
            </ins>
          </p>

          <small>
            Correction cue: {revision.cue}
          </small>

          <Evidence
            quote={revision.evidence}
            confidence={revision.confidence}
          />
        </div>
      ))}

      {display.unmatchedRevisionIds.length > 0 && (
        <div className="ghost-warning">
          <AlertTriangle size={15} />
          {display.unmatchedRevisionIds.length} correction
          {display.unmatchedRevisionIds.length === 1 ? "" : "s"} need
          manual review because the original wording could not be
          located uniquely in the transcript.
        </div>
      )}
    </div>
  );
}

export default function BlueprintIntelligence({
  meeting,
}: Props) {
  const [showTranslated, setShowTranslated] = useState(false);

  const decisionRecords = meeting.decisionRecords || [];
  const revisions = meeting.revisions || [];
  const visualEvidence = meeting.visualEvidence || [];

  const hasLanguageData =
    Boolean(meeting.originalLanguage) ||
    Boolean(meeting.outputLanguage) ||
    Boolean(meeting.translatedTranscript) ||
    Boolean(meeting.detectedLanguages?.length);

  return (
    <div className="ghost-intelligence">
      <section className="brief-section">
        <h4>
          <ShieldAlert size={15} />
          DECISION INTELLIGENCE
        </h4>

        {decisionRecords.length ? (
          <div className="ghost-intel-list">
            {decisionRecords.map((item, index) => (
              <article
                className="ghost-intel-card"
                key={`${item.decision}-${index}`}
              >
                <div className="ghost-intel-heading">
                  <b>{statusLabel(item.status)}</b>
                  <span>{percent(item.confidence)}</span>
                </div>

                <p>{item.decision}</p>

                {item.rationale && (
                  <small>Rationale: {item.rationale}</small>
                )}

                <Evidence
                  quote={item.evidence}
                  confidence={item.confidence}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="ghost-muted">
            No additional decision classifications were returned.
            The confirmed decision list remains above.
          </p>
        )}
      </section>

      <section className="brief-section">
        <h4>
          <FileText size={15} />
          VERBAL CORRECTIONS
        </h4>

        <RevisionPanel
          transcript={meeting.transcript}
          revisions={revisions}
        />
      </section>

      <section className="brief-section">
        <h4>
          <CheckCircle2 size={15} />
          ACTION EXECUTION REGISTER
        </h4>

        {meeting.actionItems.length ? (
          <div className="ghost-action-register">
            {meeting.actionItems.map((action, index) => (
              <article
                className="ghost-action-card"
                key={`${action.task}-${index}`}
              >
                <div className="ghost-action-title">
                  <b>{action.task}</b>
                  <span
                    className={`ghost-priority ghost-priority-${action.priority || "normal"}`}
                  >
                    {action.priority || "normal"}
                  </span>
                </div>

                <div className="ghost-action-meta">
                  <span>Owner: {action.owner}</span>
                  <span>Due: {action.due}</span>
                  <span>Status: {action.status || "unclear"}</span>
                </div>

                {action.dependency && (
                  <p>
                    <Link2 size={13} />
                    Dependency: {action.dependency}
                  </p>
                )}

                {action.completionCriteria && (
                  <p>
                    <CheckCircle2 size={13} />
                    Completion: {action.completionCriteria}
                  </p>
                )}

                <Evidence
                  quote={action.evidence}
                  confidence={action.confidence}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="ghost-muted">
            No action items were identified.
          </p>
        )}
      </section>

      {visualEvidence.length > 0 && (
        <section className="brief-section">
          <h4>
            <Video size={15} />
            VISUAL MEETING EVIDENCE
          </h4>

          {visualEvidence.map((item, index) => (
            <article
              className="ghost-intel-card"
              key={`${item.timestampSeconds}-${index}`}
            >
              <b>
                {formatTimestamp(item.timestampSeconds)}
              </b>
              <p>{item.description}</p>
              <small>{item.significance}</small>
              <Evidence confidence={item.confidence} />
            </article>
          ))}
        </section>
      )}

      {hasLanguageData && (
        <section className="brief-section">
          <h4>
            <Languages size={15} />
            LANGUAGE & TRANSCRIPTION
          </h4>

          {meeting.originalLanguage && (
            <p>
              Original language: {meeting.originalLanguage}
            </p>
          )}

          {meeting.detectedLanguages?.length ? (
            <p>
              Detected languages:{" "}
              {meeting.detectedLanguages.join(", ")}
            </p>
          ) : null}

          {meeting.outputLanguage && (
            <p>
              Blueprint language: {meeting.outputLanguage}
            </p>
          )}

          {meeting.translatedTranscript && (
            <>
              <button
                className="mini-action"
                onClick={() =>
                  setShowTranslated((value) => !value)
                }
              >
                {showTranslated
                  ? "Show original transcript"
                  : "Show translated transcript"}
              </button>

              {showTranslated && (
                <p className="transcript-text">
                  {meeting.translatedTranscript}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}