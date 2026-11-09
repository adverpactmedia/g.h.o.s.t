
import type { VerbalRevision } from "@/types/meeting";

export type RevisionDisplaySegment = {
  text: string;
  kind: "normal" | "superseded" | "replacement";
  revisionId?: string;
  confidence?: number;
  status?: VerbalRevision["status"];
};

export type RevisionRenderResult = {
  segments: RevisionDisplaySegment[];
  unmatchedRevisionIds: string[];
};

type LocatedRevision = {
  revision: VerbalRevision;
  start: number;
  end: number;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function locateUniquePhrase(
  transcript: string,
  phrase: string
): { start: number; end: number } | null {
  const cleanPhrase = phrase.trim();

  if (!cleanPhrase) return null;

  const expression = new RegExp(
    escapeRegExp(cleanPhrase),
    "gi"
  );

  const matches = Array.from(
    transcript.matchAll(expression)
  );

  if (matches.length !== 1) {
    return null;
  }

  const match = matches[0];

  if (match.index === undefined) {
    return null;
  }

  return {
    start: match.index,
    end: match.index + match[0].length,
  };
}

/**
 * Creates a visual representation of verbal corrections.
 *
 * The original transcript is never changed.
 * Only exact, unique phrase matches are crossed out.
 * Repeated, overlapping or ambiguous matches are flagged.
 */
export function buildRevisionDisplay(
  transcript: string,
  revisions: VerbalRevision[]
): RevisionRenderResult {
  if (!transcript || revisions.length === 0) {
    return {
      segments: transcript
        ? [{ text: transcript, kind: "normal" }]
        : [],
      unmatchedRevisionIds: [],
    };
  }

  const located: LocatedRevision[] = [];
  const unmatchedRevisionIds: string[] = [];

  for (const revision of revisions) {
    const original = revision.originalText.trim();
    const replacement = revision.correctedText.trim();

    if (
      !original ||
      !replacement ||
      original.toLocaleLowerCase() ===
        replacement.toLocaleLowerCase()
    ) {
      unmatchedRevisionIds.push(revision.id);
      continue;
    }

    const location = locateUniquePhrase(
      transcript,
      original
    );

    if (!location) {
      unmatchedRevisionIds.push(revision.id);
      continue;
    }

    located.push({
      revision,
      start: location.start,
      end: location.end,
    });
  }

  located.sort((a, b) => a.start - b.start);

  const accepted: LocatedRevision[] = [];
  let lastEnd = -1;

  for (const item of located) {
    if (item.start < lastEnd) {
      unmatchedRevisionIds.push(item.revision.id);
      continue;
    }

    accepted.push(item);
    lastEnd = item.end;
  }

  const segments: RevisionDisplaySegment[] = [];
  let cursor = 0;

  for (const item of accepted) {
    const { revision } = item;

    if (item.start > cursor) {
      segments.push({
        text: transcript.slice(cursor, item.start),
        kind: "normal",
      });
    }

    segments.push({
      text: transcript.slice(item.start, item.end),
      kind: "superseded",
      revisionId: revision.id,
      confidence: revision.confidence,
      status: revision.status,
    });

    segments.push({
      text: ` ${revision.correctedText} `,
      kind: "replacement",
      revisionId: revision.id,
      confidence: revision.confidence,
      status: revision.status,
    });

    cursor = item.end;
  }

  if (cursor < transcript.length) {
    segments.push({
      text: transcript.slice(cursor),
      kind: "normal",
    });
  }

  return {
    segments,
    unmatchedRevisionIds,
  };
}
