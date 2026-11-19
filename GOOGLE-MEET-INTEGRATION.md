# G.H.O.S.T. Google Meet Integration

Status: implementation specification; no automatic Meet attendance is currently available.

## Product behavior

The first Google Meet release is an authorized post-meeting capture and processing integration, not an invisible meeting bot and not a promise of unrestricted live audio streaming.

1. A STABLOCITY user connects their own Google account through the authenticated STABLOCITY Google OAuth flow.
2. The user explicitly enables Meet artifact processing for the relevant workspace and meeting source.
3. G.H.O.S.T./STABLOCITY receives an authorized Google Workspace event indicating a conference or transcript artifact change.
4. The backend verifies the event delivery, resolves the linked Google account and owning STABLOCITY workspace, then fetches the corresponding Meet conference record, participants, attendance sessions and transcript entries using that user's access token.
5. The backend stores a durable, workspace-scoped source record and processing status.
6. Gemini converts the transcript into a Meeting Blueprint.
7. The user reviews the Blueprint and explicitly selects which tasks, contact updates, deal changes, email drafts or calendar actions to send to the STABLOCITY agent.
8. The STABLOCITY action engine validates and executes approved actions, recording audit outcomes.

## Google API facts and constraints

- The Meet REST API exposes conference records, participants, participant sessions, recordings, transcripts and transcript entries.
- The Google Workspace Events API can deliver Meet conference lifecycle and transcript artifact events through Google Cloud Pub/Sub.
- Meet transcript entries are structured by speaker and timestamp.
- Transcript entries are available for 30 days after the conference ends. Event delivery must trigger prompt ingestion; a periodic reconciliation job is required to recover missed events.
- The user must authorize access using Google OAuth credentials. The Meet REST API does not provide anonymous access to user meeting content.
- Initial Meet metadata scope: `https://www.googleapis.com/auth/meetings.space.readonly`.
- Additional Drive scopes must not be requested unless the implementation actually downloads Drive-hosted transcript or recording files. Prefer Meet transcript-entry resources where they meet product requirements.
- Meet API artifact availability depends on the meeting's recording/transcription configuration, organizer permissions, account edition and Google Workspace policies. The product must report unavailable artifacts instead of pretending every meeting produced a transcript.

## Event ingestion requirements

- Validate Pub/Sub push authentication and expected audience/service identity.
- Validate message structure and base64 payload decoding.
- Treat all event payloads as untrusted input.
- Bind every subscription and conference record to the connected Google account and one workspace.
- Deduplicate event deliveries and artifact imports using stable provider resource names.
- Persist event receipt, processing status, retry count and last error without storing OAuth tokens in logs.
- Use bounded retries with backoff and a dead-letter/reconciliation path.
- Never trust a workspace ID or CRM record ID carried in a Pub/Sub payload.
- Do not expose a public endpoint that accepts arbitrary conference resource names without verifying account ownership.

## Consent, privacy and retention

- Users must enable capture and understand what meeting artifacts are retrieved.
- Provide a clear recording/transcription notice and consent guidance. Follow applicable laws, organization policy and Google Workspace terms.
- Provide disconnect and deletion controls.
- Store only the minimum transcript/attendance data needed for the configured feature.
- Define retention separately for raw transcripts, generated Blueprints and CRM action audit records.
- Do not claim that Google Meet API access means G.H.O.S.T. joins a meeting or captures live audio.
- Do not claim universal availability across personal Google accounts, Workspace editions or admin configurations until tested.

## Acceptance tests

- Only the connected Google account's authorized conferences can be ingested.
- A user cannot import another user's conference by changing a resource name.
- A Workspace A user cannot attach a conference or Blueprint to Workspace B.
- Duplicate Pub/Sub delivery creates one source record and one processing job.
- Invalid Pub/Sub authentication is rejected.
- Missing transcript artifacts are reported as unavailable, not as successful capture.
- Pagination retrieves all transcript entries within provider limits.
- Events missed during downtime are recovered by reconciliation while artifacts remain available.
- Disconnect revokes/invalidates the stored connection and prevents future ingestion.
- Deletion requests remove stored meeting content according to the published retention policy.
- Desktop and mobile flows are tested before release.

## Current state

G.H.O.S.T. currently uses browser-local meeting history and Gemini for user-submitted audio/transcripts. It does not have user accounts, Google OAuth, Meet event subscriptions, Pub/Sub ingestion, automatic Meet attendance or durable cloud meeting history. This specification does not make those features available.
