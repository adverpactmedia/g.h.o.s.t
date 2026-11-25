# STABLOCITY Integration Contract

Status: G.H.O.S.T. implements a standalone meeting-analysis application, a user-directed Markdown handoff, and a private HMAC-authenticated server-to-server analysis endpoint. STABLOCITY CRM/RM contain a Google Meet transcript worker that can submit eligible Google-generated transcripts to this endpoint and store completed Blueprints in the originating workspace. Repository tests pass for the G.H.O.S.T. release branch. Real Google OAuth, Google Meet event delivery, Gemini provider processing and authenticated CRM/RM end-to-end acceptance remain pending.

## Product/service boundary

- G.H.O.S.T. is a separate web application and deployment; it is not embedded in STABLOCITY.
- It is independently useful for browser microphone/tab capture where supported, transcript paste, Gemini analysis, reviewed Blueprints and Markdown export.
- Meeting history remains in the user's browser profile. It is not a cloud archive or cross-device synchronized history.
- STABLOCITY can consume a Blueprint through either manual Markdown import or the connected Google Meet transcript pipeline.

## Handoff path A: reviewed Markdown

1. The user reviews a completed Meeting Blueprint in G.H.O.S.T.
2. The user exports the Blueprint as Markdown and opens the STABLOCITY import workflow.
3. The signed-in STABLOCITY user selects the destination workspace and may optionally associate a contact, company or deal.
4. The receiver validates workspace write access and same-workspace record membership, rejects duplicate imports and records an audit event.

The Markdown file is untrusted content. It cannot set permissions, change the destination workspace on its own or grant access to a CRM record.

## Handoff path B: Google Meet post-meeting transcript

The STABLOCITY CRM/RM Google Workspace worker supports eligible Google-generated post-meeting transcripts:

1. A workspace administrator connects Google Workspace and configures an authorized Google Meet event subscription.
2. STABLOCITY receives the transcript-ready event and checks that the transcript belongs to the subscribed Meet space.
3. STABLOCITY retrieves the transcript and available participant information through the connected Google account.
4. STABLOCITY sends the transcript to `POST /api/internal/meetings/analyze` with:
   - `x-stablocity-timestamp`
   - `x-stablocity-event-id`
   - `x-stablocity-signature`
5. G.H.O.S.T. verifies an HMAC-SHA256 signature over the timestamp, event ID and exact raw request body, with a five-minute clock window and constant-time comparison.
6. G.H.O.S.T. claims the event in its Supabase-backed idempotency store. A reused event ID with a different body is rejected; in-progress duplicates do not start a second analysis.
7. G.H.O.S.T. starts Gemini analysis and returns an interaction ID plus a short-lived poll token.
8. STABLOCITY polls for the completed analysis, converts the Blueprint to a meeting record and stores it in the originating workspace. A contact/company association is made only when the participant email uniquely matches a contact in that workspace.

This is not a meeting bot. It does not autonomously join Google Meet, Zoom or Microsoft Teams, and it does not capture live meeting audio from those platforms. It processes Google-generated post-meeting transcripts made available to the authorized account.

## Security and data boundaries

- The internal endpoint is server-to-server and requires a shared high-entropy secret.
- The exact raw request body is signed; modified bodies, invalid signatures and stale timestamps are rejected.
- Event IDs and body hashes provide durable idempotency when Supabase storage is configured.
- The poll token is short-lived and bound to the Gemini interaction ID.
- Imported/received meeting content is data, never executable instructions.
- The STABLOCITY receiver and worker enforce the active workspace boundary. The Markdown handoff cannot expand permissions.
- Current STABLOCITY authorization is workspace-level. Comprehensive per-contract/per-deal ACL enforcement across every list, detail, search, export and mutation path remains a separate release gate.

## Required environment

### G.H.O.S.T. hosting

- `GEMINI_API_KEY`
- `GHOST_SESSION_SECRET`
- `STABLOCITY_GHOST_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

### STABLOCITY CRM/RM hosting

- `GHOST_INTERNAL_URL`
- `GHOST_WEBHOOK_SECRET` (must match `STABLOCITY_GHOST_WEBHOOK_SECRET`)
- Google OAuth client ID and secret.
- Google token/data encryption keys.
- Google Meet Pub/Sub topic, audience and service-account settings.
- Meet worker enabled and scheduled.

Do not commit secrets or expose the Supabase service-role key to browser code. The service must fail closed when the internal event store is unavailable; it must not silently start untracked analysis.

## Verification status

### Automated repository verification

The G.H.O.S.T. release branch currently passes its GitHub Actions checks, including TypeScript typecheck, ESLint, Vitest tests, Next.js production build, PostgreSQL migration application and atomic shared rate-limit checks.

CRM/RM include automated tests for request signing, worker orchestration, transcript processing, workspace storage and the Markdown import path. Their latest candidate CI attempts have not executed any test steps because GitHub did not allocate a runner; these attempts are not passing evidence.

### Required live acceptance

Before calling the complete integration production-ready, test:

- Real Google OAuth with a dedicated test account.
- Google Meet subscription creation and transcript-ready event delivery.
- Correct source-space validation and transcript retrieval.
- Valid HMAC request accepted by G.H.O.S.T.
- Tampered body, expired timestamp and invalid signature rejected.
- Duplicate event does not start duplicate analysis.
- Supabase outage fails closed without starting an untracked analysis.
- Gemini completes a real transcript analysis.
- STABLOCITY polls and stores the Blueprint in the originating workspace.
- Participant/contact matching never crosses workspace boundaries.
- Viewer, non-member and cross-workspace attempts are rejected.
- Full flow works in both CRM and RM deployments.

## Provider retention

The analysis route currently uses a stored background Gemini interaction to support polling and attempts to delete the interaction after a terminal result. Cleanup is best-effort. Abandoned jobs or cleanup failures may remain subject to Google's retention terms. The configured Gemini project's billing/data tier must be verified before confidential business information is processed. Do not claim zero retention or enterprise privacy.

## What is not provided

- Autonomous meeting attendance or live third-party meeting capture.
- Outbound email sending or calendar event creation by G.H.O.S.T.
- External task-system completion synchronization.
- Cloud meeting-history archive or cross-device history synchronization.
- Per-contract/per-deal authorization inside G.H.O.S.T.
