# G.H.O.S.T. Production Readiness and Integration Gate

Last reviewed: 2026-11-19

This file separates deployed capabilities from requested capabilities that are not yet implemented. It is a release-control document, not marketing copy.

## Deployed and present in source

- Browser microphone and shared-tab recording where the browser supports it and the user grants permission.
- Manual transcript paste.
- Gemini-based transcription and Meeting Blueprint analysis.
- Summaries, decisions, action items, owners/dates when stated, verbal corrections and follow-up drafts.
- Markdown Meeting Blueprint export.
- Transfer to STABLOCITY action: downloads the reviewed Markdown file and opens the user's own STABLOCITY import page.
- STABLOCITY CRM and RM import page/API: signed-in user selects an industry workspace and may optionally attach the meeting to a contact, company or deal. Workspace-level authorization and same-workspace record validation are enforced. Duplicate imports are idempotent and an audit event is recorded.
- Analysis polling requires a short-lived signed token bound to the Gemini interaction ID.
- Temporary Gemini audio upload is deleted after transcription is attempted.

## Not implemented

- Autonomous joining/attendance in Zoom.
- Autonomous joining/attendance in Google Meet.
- Autonomous joining/attendance in Microsoft Teams.
- Sending emails from the user's Gmail, Outlook or SMTP identity.
- Creating or updating calendar events.
- Synchronizing G.H.O.S.T. action-item status with STABLOCITY tasks or external task providers.
- Authenticated cloud accounts and cross-device meeting-history synchronization.
- Per-user or per-contract access controls inside G.H.O.S.T.
- Per-deal/contract ACLs in STABLOCITY across every read, search, export and write path.

Do not describe these as available or imply that G.H.O.S.T. is fully operational for these workflows.

## Infrastructure blockers

The G.H.O.S.T. Vercel project currently has the Gemini API key configured but no persistent application database has been provisioned. No Render Postgres instance was found in the connected workspace. Browser-local history cannot become reliable cross-device history without a persistent database and an authenticated account model.

A production database requires a selected provider, plan, region, backup/restore policy and explicit budget approval. Do not create a paid database without approval.

## Provider registration requirements

Each external provider needs its own app registration and credentials, redirect/callback URLs, approved scopes, user-consent flow, token refresh/revocation handling and production testing.

- Zoom: developer app registration and the supported meeting capture/attendance architecture. Bot attendance may require additional provider approval and is not equivalent to ordinary OAuth.
- Google: OAuth client registration, Calendar scopes, and separate evaluation/approval for any Google Meet media or meeting participation capability.
- Microsoft: Entra application registration, Microsoft Graph permissions, tenant admin consent where required, and separate meeting-bot/communications permissions where needed.
- Email: delegated Gmail or Microsoft Graph permission, or a separately configured SMTP provider. The user's sender identity must be authorized.

No client IDs, client secrets, certificates, tenant IDs or provider approvals are assumed to exist.

## Security release gate

Before claiming G.H.O.S.T. is hardened for confidential business use:
1. Add authenticated user accounts and session management.
2. Add persistent database storage with user/workspace ownership and tenant isolation.
3. Enforce authentication and authorization on every API route.
4. Replace process-local rate limiting with a shared distributed limiter and abuse monitoring.
5. Encrypt provider refresh tokens at rest and keep secrets server-side.
6. Add account-level retention, export and deletion controls.
7. Add CSRF/origin protection, secure cookie settings, upload/request limits and provider webhook signature validation.
8. Add audit logs for data access and external actions.
9. Complete dependency, static, dynamic and penetration testing.
10. Verify backup restoration, incident response and privacy disclosures for Gemini and all connected providers.

## STABLOCITY authorization boundary

The transfer receiver enforces existing workspace membership/write access and verifies that optional linked records belong to the selected workspace. It does not yet provide per-contract/deal ACLs. A user who can write to a workspace may have broader access to records in that workspace under the current STABLOCITY model. Do not claim contract-specific confidentiality until record-level permissions are implemented consistently across the entire CRM/RM application and audited.

## Release acceptance

A feature is complete only after:
- Provider sandbox and production configuration are verified.
- Positive and negative authorization tests pass.
- Retry, rate-limit, revoked-token, timeout and provider outage behavior is tested.
- Data deletion and retention behavior is verified.
- The user-facing flow is tested on desktop and mobile.
- Both STABLOCITY CRM and RM handoff paths pass authenticated end-to-end tests.
