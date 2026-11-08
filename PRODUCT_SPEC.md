# Product Specification

## Vision

Make every meeting end with a clear account of what happened and what happens next.

## Product Identity

**G.H.O.S.T.**

Gather. Highlight. Organize. Summarize. Track.

**Your meetings end. Their decisions don't.**

G.H.O.S.T. turns a recorded conversation or transcript into a structured Meeting Blueprint.

## Target User

Independent consultants, account managers, project leads and small-business professionals who attend recurring meetings and personally manage follow-through.

This target audience is a working hypothesis, not a validated customer segment.

## Problem

Meeting participants rely on memory, scattered notes and hurried follow-up.

Decisions blur into suggestions. Action items lose owners. Deadlines are forgotten. Participants mentally replay conversations because they lack a clear record of what was agreed.

## Value Proposition

G.H.O.S.T. converts a meeting recording or transcript into:

- A concise meeting summary.
- Objective, friction and alignment.
- Explicitly identified decisions.
- Action items, owners and deadlines.
- Estimated efficiency indicators.
- Three ready-to-edit follow-up drafts.

The output is a reviewable Meeting Blueprint, not simply a transcript or generic summary.

## Core User Journeys

### 1. Record a Conversation

1. Enter a meeting title.
2. Select microphone or meeting-tab capture.
3. Confirm recording consent.
4. Grant the required browser permission.
5. Record the conversation.
6. Stop recording.
7. Send audio for transcription.
8. Review the resulting transcript.
9. Generate the Meeting Blueprint.

### 2. Import a Transcript

1. Open transcript entry.
2. Paste or edit transcript text.
3. Select a follow-up writing style.
4. Generate the Meeting Blueprint.
5. Review the completed result.

Transcript import currently means pasting text. It is not a general document-upload feature.

### 3. Review and Reuse

1. Read the meeting summary.
2. Review objective, friction and alignment.
3. Verify identified decisions.
4. Review action items, owners and deadlines.
5. Review the efficiency indicators and methodology.
6. Copy a follow-up draft.
7. Export the Blueprint as Markdown.
8. Optionally export the Blueprint with its original transcript.
9. Reopen or delete saved meeting history.

## Meeting Blueprint Structure

### Meeting Summary

A concise overview of the conversation.

### Meeting Outcome

- Objective
- Friction
- Alignment

The output must distinguish agreement from unresolved discussion.

### Confirmed Decisions

Only explicit agreements belong here.

Suggestions, possibilities and questions must not be represented as confirmed decisions.

### Action Items

Each action contains:

- Task
- Owner
- Deadline

Unknown owners must be marked as unassigned. Unknown deadlines must be marked as TBD.

### Efficiency Meter

- Transcript volume
- Estimated actionable velocity
- Estimated non-actionable content
- Methodology and limitations

These are estimates derived from transcript content. They are not measured meeting duration, verified time savings or audited productivity metrics.

### Follow-up Drafts

Three distinct drafts:

1. Executive Blueprint: concise, direct and decision-oriented.
2. Client-Facing Delight: professional and clear, with confirmation requests only when appropriate.
3. Team-Hustle Pulse: natural internal communication with clear next steps.

All drafts require human review before sending.

## Current MVP Scope

- Browser-based application.
- Microphone recording.
- Browser meeting-tab audio capture where supported.
- Explicit recording consent confirmation.
- Transcript paste and editing.
- Google Gemini audio transcription.
- Google Gemini background analysis.
- Structured Meeting Blueprint.
- Spoken summary using browser speech synthesis.
- Four writing-style preferences.
- Browser-local meeting history.
- Copy follow-up drafts.
- Markdown export.
- Optional transcript-inclusive Markdown export.
- Delete saved meetings.

## Current Technical Architecture

- Next.js application.
- React client interface.
- TypeScript.
- Google Gemini API.
- Server-side `GEMINI_API_KEY`.
- Gemini Files API for temporary audio uploads.
- Gemini Interactions API for background analysis.
- Browser local storage for meeting history.
- Vercel deployment.

## Data Model

The current MeetingResult includes:

- title
- summary
- objective
- friction
- alignment
- spokenSummary
- decisions[]
- actionItems[]
  - task
  - owner
  - due
- efficiencyMeter
  - meetingVolume
  - actionableVelocityPercent
  - corporateNoiseFilteredPercent
  - methodology
- executiveFollowUp
- clientFollowUp
- teamFollowUp
- followUp
- transcript
- createdAt

Meeting history is stored locally in the browser. There is no hosted archive or account-based synchronization.

## Security and Privacy

- The Gemini API key must remain server-side.
- Audio and transcript content are sent to Google Gemini for processing.
- Temporary Gemini audio-file deletion is attempted after transcription.
- Analysis interactions currently use `store: true`.
- Browser-local history is not an encrypted cloud archive.
- API routes currently lack user authentication.
- Current rate limiting uses process-local memory and is not a complete serverless abuse-control solution.
- Keep the deployment protected during the pilot.
- Do not claim zero retention, guaranteed deletion, PIPEDA compliance or other certification without verification.

## Known Limitations

- Maximum audio upload size: 4 MB.
- No long-recording chunking.
- No autonomous meeting bots.
- No direct cellular call interception.
- No native Zoom, Meet or Teams integration.
- No user accounts.
- No cloud synchronization.
- No team collaboration.
- No task completion tracking.
- No reminders or notifications.
- No calendar, CRM or email integration.
- No billing or subscription enforcement.
- No verified PDF or DOCX export.
- No guaranteed accuracy of AI-generated decisions or commitments.

## Error States

The application should provide clear recovery guidance for:

- Missing API configuration.
- Unsupported browser recording.
- Denied microphone permission.
- Cancelled screen or tab sharing.
- Missing tab audio.
- Empty or oversized recordings.
- Unsupported audio formats.
- Transcription failure.
- Analysis failure.
- Analysis timeout.
- Invalid AI output.
- Browser storage quota errors.

Where possible, retain the user's transcript so analysis can be retried without repeating the recording.

## Success Metrics

### Activation

Percentage of first-time users who generate their first Blueprint.

### Capture Completion

Percentage of started recordings that successfully produce a transcript.

### Analysis Completion

Percentage of submitted transcripts that successfully produce a Blueprint.

### Time to Value

Time between transcript submission and completed Blueprint.

### Repeat Usage

Meetings processed per active user per week.

### Follow-up Utility

Percentage of users who copy or export a follow-up draft.

### Retention

Week-one and week-four repeat usage.

### Unit Economics

Transcription and analysis cost per completed meeting.

### Trust

- Corrections to AI-generated decisions.
- Corrections to action owners and deadlines.
- Recording-consent confusion.
- Processing failures.
- Deletion requests.

## Roadmap

1. Complete protected pilot testing.
2. Validate repeat usage with a small professional cohort.
3. Improve recording and transcription reliability.
4. Establish reliable authentication and usage limits.
5. Measure actual API cost per completed meeting.
6. Validate pricing and willingness to pay.
7. Add billing only after identity, metering and entitlements are implemented.
8. Consider cloud synchronization and integrations only when customer demand supports them.