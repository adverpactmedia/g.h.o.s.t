# G.H.O.S.T. Voice Agent and External Integration Specification

Status: target architecture; features below are not implemented unless explicitly listed in PRODUCT_SPEC.md or PRODUCTION-READINESS.md.

## Product role
G.H.O.S.T. remains the meeting intelligence companion. It captures or receives meeting content, builds a reviewable Meeting Blueprint and helps users move approved outcomes into the systems where they work. It is not to become a mandatory cloud archive.

## Local-first data boundary
- Meeting history remains in the current browser/device profile by default.
- No mandatory G.H.O.S.T. user-account archive or cloud database.
- User can export Markdown, JSON, CSV and other supported formats.
- User explicitly chooses every external destination and data category.
- Local history deletion/export behavior must be clear.
- Provider processing of audio/transcript is separate from local history storage and must be disclosed accurately.
- Direct provider synchronization may require a customer-controlled relay for long-lived OAuth secrets. Never persist long-lived refresh tokens in unencrypted browser localStorage.

## Voice agent
A user taps the microphone and grants permission. The agent supports natural conversation, search, meeting capture controls, summary readback, correction and approved export actions. The UI visibly shows listening, interpretation, proposed action, confirmation and completion.

The model may call only typed, allowlisted application tools. No arbitrary DOM, SQL, shell, HTTP or unrestricted browser actions. All tools validate input, enforce user consent, use idempotency and write audit records where an external system is changed.

User preferences are individual: voice, language, speaking speed, verbosity, interruption behavior and private-output preference. A company admin can control available provider choices but cannot silently override a user's selected voice. Voice is not authentication. Custom voice cloning requires explicit speaker consent and provider/legal review.

Actions requiring immediate confirmation include joining/recording a meeting, sending email, creating/modifying a calendar event, external sharing, enabling bidirectional sync, deleting or exporting sensitive records.

## Meeting platform adapters

### Zoom
Investigate Zoom Realtime Media Streams and meeting lifecycle APIs. RTMS streams live media/transcripts without requiring a conventional participant bot, but requires Zoom credits and app/account authorization. The adapter must verify app installation, scopes, host/tenant configuration, meeting policy, participant disclosure, webhook signatures and stream lifecycle. Do not assume it is free.

### Google Meet
Use supported Meet REST API, Workspace Events and Meet add-on features where they meet the user journey. Google says the Meet Media API Developer Preview is discontinued and existing access ends 15 January 2027. Do not build a production dependency on that preview. The Meet REST API supports meeting-space management and post-meeting artifacts; it is not a general guarantee of live raw audio access.

### Microsoft Teams
Assess supported Teams bot, Graph transcript and Copilot Studio approaches. Microsoft documentation says its Real-time Media Platform is not recommended for AI agent scenarios. Any bot must satisfy tenant admin consent, bot registration, meeting policy, recording disclosure and provider requirements.

The product may not auto-join a meeting simply because microphone permission was granted. Platform-level authorization and host/tenant policies are separate.

## Email
- Provider OAuth with least-privilege scopes.
- Preview sender account, recipient, subject, body and attachments.
- Require immediate explicit confirmation before send.
- Handle revoked/expired tokens, rate limits, duplicate prevention and delivery failure.
- Store only necessary send metadata; protect body content according to user's retention choice.
- mailto draft opening is not direct sending.

## Calendar
- Explicit provider and calendar selection.
- Preview title, participants, start/end, timezone, location, conference link and reminders.
- Require confirmation before write.
- Idempotency keys prevent duplicate events.
- Respect conflict, cancellation and permission responses.

## Task destinations
First release: safe local Markdown/JSON/CSV/ICS export.
Obsidian: Markdown folder/vault export through user-selected local file access or a local companion; do not assume a cloud API.
Notion, Google and Microsoft: separate OAuth adapters, scopes, field mapping, external IDs, revocation and audit.
One-way export is default. Bidirectional synchronization requires explicit opt-in for each connection/object type, conflict detection, safe deletion semantics and a disconnect path.

## Mobile
Test Android Chrome and iOS Safari separately. Microphone, audio playback, background behavior, screen lock and permissions differ by browser/OS. Always provide a visible stop control and accessible text alternative. No always-on listening in the first release.

## Acceptance gates
See VOICE_BCRM_TEST_MATRIX.md in the STABLOCITY repositories. G.H.O.S.T. provider release records must identify exact app registration, scopes, test tenant/account type, test date, commit, successful and denied test cases, provider data handling and cleanup/revocation results.
