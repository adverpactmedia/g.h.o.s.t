# G.H.O.S.T. Voice and Integration Acceptance Matrix

Status: criteria only; no tests in this file are marked passed.

Every executed test must record commit, deployment, date, provider account/tenant type, OAuth scopes, actual result, logs/artifact, cleanup and token revocation evidence.

## Local-first guarantees
- GHOST-LOCAL-01 history persists after reload in same browser profile.
- GHOST-LOCAL-02 history is not written to a G.H.O.S.T. cloud database.
- GHOST-LOCAL-03 export and deletion behavior is clear.
- GHOST-LOCAL-04 provider processing disclosure matches actual data path.
- GHOST-LOCAL-05 provider upload/interaction cleanup success and failure are tested.

## Voice agent
- GHOST-VOICE-01 mic permission and stop lifecycle.
- GHOST-VOICE-02 visible listening state and interrupt/barge-in.
- GHOST-VOICE-03 per-user voice/language preferences.
- GHOST-VOICE-04 natural-language search and disambiguation.
- GHOST-VOICE-05 typed tool allowlist; no arbitrary DOM/SQL/HTTP.
- GHOST-VOICE-06 user confirmation before consequential actions.
- GHOST-VOICE-07 action readback reflects persisted result.
- GHOST-VOICE-08 transcript prompt injection cannot authorize tools.
- GHOST-VOICE-09 network interruption and session expiry.
- GHOST-VOICE-10 private audio output and accessible text fallback.

## Meeting platform adapters
- GHOST-MEET-01 missing OAuth scopes rejected.
- GHOST-MEET-02 organizer/tenant policy denial handled.
- GHOST-MEET-03 join/record consent state required.
- GHOST-MEET-04 webhook signature and replay protection.
- GHOST-MEET-05 duplicate event idempotency.
- GHOST-MEET-06 stream interruption and meeting end.
- GHOST-MEET-07 provider token revocation.
- GHOST-MEET-08 Zoom RTMS test tenant and credit requirement recorded.
- GHOST-MEET-09 Google Meet implementation uses supported GA interfaces, not discontinued preview.
- GHOST-MEET-10 Teams architecture follows current Microsoft recommendation and tenant policy.

## Email and calendar
- GHOST-MAIL-01 least-privilege OAuth connect/disconnect.
- GHOST-MAIL-02 exact sender/recipient/content preview.
- GHOST-MAIL-03 explicit immediate send confirmation.
- GHOST-MAIL-04 duplicate-send prevention.
- GHOST-MAIL-05 provider failure/retry and revoked token.
- GHOST-CAL-01 timezone/DST/attendee correctness.
- GHOST-CAL-02 preview and explicit create confirmation.
- GHOST-CAL-03 duplicate event prevention.
- GHOST-CAL-04 conflict/cancellation handling.

## Task destinations
- GHOST-SYNC-01 local Markdown/JSON/CSV/ICS export.
- GHOST-SYNC-02 Obsidian safe local vault/file export.
- GHOST-SYNC-03 Notion/Google/Microsoft OAuth scopes and user consent.
- GHOST-SYNC-04 one-way export default.
- GHOST-SYNC-05 bidirectional sync opt-in.
- GHOST-SYNC-06 concurrent edit conflict surfaced.
- GHOST-SYNC-07 remote deletion never silently deletes local data.
- GHOST-SYNC-08 disconnect stops future sync.
- GHOST-SYNC-09 restricted STABLOCITY deal data is filtered before export.

## Mobile and privacy
- GHOST-MOBILE-01 Android Chrome capture/voice.
- GHOST-MOBILE-02 iOS Safari capture/voice.
- GHOST-MOBILE-03 desktop browser support matrix.
- GHOST-MOBILE-04 screen lock/background behavior.
- GHOST-MOBILE-05 accessible touch/text fallback.
- GHOST-SEC-01 secrets absent from client bundle/logs.
- GHOST-SEC-02 OAuth state/PKCE and callback allowlist.
- GHOST-SEC-03 consent and privacy disclosures accurate.
- GHOST-SEC-04 provider retention/deletion failure accurately disclosed.
