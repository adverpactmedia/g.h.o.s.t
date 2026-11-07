# Product specification

## Vision

Make every meeting end with a clear account of what happened and what happens next.

## Target user

Independent consultants, account managers, project leads and small-business professionals who attend several calls a week and personally own follow-through.

## Problem

Meeting participants rely on memory, scattered notes and hurried follow-up. Decisions blur into suggestions, action items lose owners, and the same conversation gets replayed mentally after the call.

## Value proposition

G.H.O.S.T. converts one meeting into a spoken recap, explicit decisions, action items and a ready-to-edit follow-up draft in a chosen communication style.

## Core journeys

### Capture a meeting
1. Name the meeting.
2. Initiate tab sharing and enable tab audio.
3. See an unmistakable recording state and elapsed time.
4. Stop recording or stop sharing.
5. Receive transcription and analysis feedback.

### Use an existing transcript
1. Expand the transcript input.
2. Paste transcript text.
3. Choose a writing style in preferences.
4. Generate the brief.

### Review and reuse
1. Read or play the short recap.
2. Verify decisions and action items.
3. Copy the follow-up or export the full Markdown brief.
4. Reopen a recent meeting or delete it.

## MVP scope

- One-user browser experience, no account.
- Tab-audio capture with explicit user action.
- Transcript paste fallback.
- AI transcription and structured analysis.
- Spoken summary via browser speech synthesis.
- Four follow-up styles.
- Local meeting history, copy, Markdown export and delete.

## Out of scope

- Autonomous call bots and native Zoom/Meet/Teams integration.
- Speaker identification, voice cloning, live captions, real-time coaching.
- Team workspaces, sharing, comments, tasks sync, calendar/CRM/email integrations.
- Hosted archive, auth, billing, subscription enforcement and admin console.
- Regulated-industry compliance claims.

## Information architecture

Single workspace with two stages: Capture (left) and Aftermath (right). Preferences are a small contextual panel. Recent meetings appear below the current brief.

## Key screens and states

- Workspace default: capture form, standing-by indicator, useful empty state.
- Recording: visible red state, timer, animated waveform, explicit stop action.
- Processing: disabled capture action and progress copy.
- Brief: spoken recap, decisions, action items, follow-up, export.
- History: select or delete saved meeting.
- Preferences: writing style selection.
- Error: actionable message for unsupported capture, missing tab audio, API configuration, transcription and analysis failures.

## Data model

`MeetingResult`: title, summary, spokenSummary, decisions[], actionItems[{task, owner, due}], followUp, transcript, createdAt. Stored in browser local storage under a versioned key. No user identity or server database exists in v1.

## Permissions and roles

There is one local user. The browser requires the user to grant tab/screen sharing. API endpoints require a server-side OpenAI key but are otherwise public in this version; this makes public production deployment vulnerable to API-cost abuse. Deploy behind access control or add authentication/rate limiting before opening a public paid service.

## Edge cases

- User cancels screen share: return to standing by with recovery guidance.
- No tab audio track: stop capture and explain how to enable tab audio.
- Browser lacks `getDisplayMedia`: offer transcript paste.
- Recording exceeds 24 MB: stop processing and offer shorter recording/transcript paste.
- API key missing: clear server configuration error.
- Transcription or analysis fails: retain pasted transcript in the UI where available and offer retry path.
- No decisions or action items: state that none were identified rather than inventing them.
- Local storage quota is reached: notify user to export or remove old meetings.

## Success metrics

- Activation: percentage of first-time visitors who create a first brief.
- Capture completion: percentage of started captures that produce a brief.
- Time to value: time from meeting end to playable summary.
- Repeat usage: meetings processed per active user per week.
- Follow-up utility: percentage of briefs where the follow-up is copied/exported.
- Retention: week-1 and week-4 repeat meeting processing.
- Unit economics: transcription + analysis cost per meeting hour, gross margin by pricing model.
- Trust: correction rate for decisions/actions, deletion requests and reported capture/consent confusion.

## Roadmap

1. Validate recurring use and pricing with a small professional cohort.
2. Improve long-recording reliability, chunking and retries.
3. Add optional encrypted cloud sync and account-based retention controls.
4. Add platform integrations based on customer demand and provider constraints.
5. Add paid entitlements and billing after unit economics are known.
