# G.H.O.S.T. Production Readiness and Integration Gate

Last reviewed: 2026-11-19

This file separates deployed capabilities from requested capabilities that are not implemented. It is a release-control document, not marketing copy.

## Architecture decision: local-first history

- G.H.O.S.T. does not have a meeting-history database or user-account system.
- Saved meeting history lives in the user's current browser profile via local storage.
- There is no cloud history, account-based archive or cross-device synchronization by design.
- Users can download a Meeting Blueprint as Markdown or transfer it manually into a STABLOCITY workspace.
- Clearing browser storage can permanently remove local meeting history. Users should export important records.
- G.H.O.S.T. does not require a paid database. No database has been provisioned.

## Implemented and deployed capabilities

- Browser microphone and shared-tab recording where supported and explicitly permitted by the user.
- Manual transcript paste and review.
- Gemini-based transcription and Meeting Blueprint analysis.
- Summary, decisions, action items, owners/deadlines when stated, verbal corrections and follow-up drafts.
- Markdown Meeting Blueprint export.
- Transfer to STABLOCITY action: downloads the reviewed Markdown file and opens the user's selected STABLOCITY import page.
- CRM and RM import page/API: signed-in user selects an industry workspace and may optionally attach the meeting to a contact, company or deal.
- Receiver enforces current workspace write permission, same-workspace record validation, duplicate protection and audit logging.
- Analysis polling uses a short-lived signed token bound to the Gemini interaction ID.
- Temporary Gemini audio upload is deleted after transcription is attempted.
- Completed/failed Gemini background interactions are now deleted by G.H.O.S.T. after the terminal result is retrieved, on a best-effort basis.
- G.H.O.S.T. follow-up drafts can be opened in the user's email application using a prefilled `mailto:` draft.

## Gemini provider data handling

The G.H.O.S.T. backend sends audio and transcript content to Google's Gemini API. This means information is processed outside the user's device while transcription/analysis is running, even though G.H.O.S.T. does not maintain its own meeting-history database.

- The transcription route uploads audio to the Gemini Files API and attempts to delete that temporary file in a `finally` cleanup step.
- The analysis route uses `background: true` and `store: true` to poll for completion, then attempts to delete the interaction when it reaches a terminal state.
- Google documents one-day retention for stored interactions on the free API tier and 55-day retention on the paid API tier. If a session is abandoned or cleanup fails, provider retention may apply until the record expires.
- Google's Gemini API pricing page says free-tier content may be used to improve Google products; paid-tier content is not used for that purpose.
- The configured API project's actual billing tier has not been verified here. Do not claim zero retention or enterprise privacy.
- If strict no-provider-storage is required, the analysis architecture must be changed to a stateless synchronous or streaming flow using `store: false`. Google documents that `store: false` is incompatible with background execution, so this requires a separate engineering change and timeout/streaming tests.

Users should not submit confidential, regulated or sensitive material unless their organization has reviewed and approved the provider, data terms and API tier.

## Not implemented

- Automatic joining/attendance in Zoom, Google Meet or Microsoft Teams.
- Direct email sending from G.H.O.S.T. or delegated Gmail/Outlook sending. The email button opens a draft in the user's email application; it does not send.
- Calendar event creation.
- External task-system completion synchronization.
- G.H.O.S.T. user accounts, team workspaces or cross-device history synchronization.
- Per-deal/contract ACLs in STABLOCITY across every read, search, export and write path.
- Direct HubSpot, Salesforce, Pipedrive, Zoho or spreadsheet OAuth connectors.
- A Gemini Live voice agent that navigates and operates G.H.O.S.T. or STABLOCITY.

Do not advertise these capabilities as available.

## Integration prerequisites

Each provider needs its own app registration, approved OAuth scopes, callback URLs, consent flow, secure token lifecycle, error handling, provider-policy review and end-to-end acceptance testing.

- Zoom: Meeting SDK is for human participants, not AI notetaker bots. Zoom identifies RTMS as the route for live meeting media and requires credits. External bot/attendance flows require additional provider review and authorization.
- Google Meet: Meet APIs can create spaces and retrieve meeting artifacts and attendance data. Live capture/participation requires separate capability assessment and OAuth permissions.
- Microsoft Teams: meeting bots require a registered Teams bot, Microsoft Graph permissions and tenant administrator consent.
- Google Calendar: event creation requires OAuth calendar write scopes and user consent.
- HubSpot and other CRMs: public app/OAuth registration, least-privilege object scopes, record mapping, duplicate handling, association mapping and migration acceptance testing.

No client IDs, client secrets, certificates, tenant IDs or provider approvals are assumed to exist.

## Security and release gates

Before claiming the current system is hardened for confidential, multi-user business use:

1. Complete authenticated browser acceptance tests for the Markdown transfer in both CRM and RM deployment tracks.
2. Implement and test comprehensive per-deal/contract ACLs in STABLOCITY, consistently across list, detail, search, export, activity, task and mutation paths.
3. Test two-user concurrent updates, session expiry, role changes and cross-workspace attempts.
4. Verify Gemini uploaded-file and interaction deletion, including cleanup failures and abandoned sessions.
5. Replace or supplement process-local rate limiting with an abuse-control strategy appropriate to serverless deployment.
6. Review security headers, CSP, XSS handling, CSRF/origin protections, cookie settings, input limits and dependency vulnerabilities.
7. Complete static, dynamic and independent penetration testing before claiming security certification.
8. Confirm user-facing privacy notices, recording consent requirements and provider-tier disclosures.

## STABLOCITY authorization boundary

The transfer receiver enforces existing workspace membership/write access and verifies that optional linked records belong to the selected workspace. It does not yet provide per-contract/deal ACLs. A user who can write to a workspace may have broader access to records in that workspace under the current STABLOCITY model. Do not claim contract-specific confidentiality until record-level permissions are implemented consistently across the entire CRM/RM application and independently tested.

The Markdown file is data only. It never grants access or expands the receiving user's permissions.

## Release acceptance

A feature is complete only after:
- Provider configuration and user consent are verified.
- Positive and negative authorization tests pass.
- Retry, rate-limit, revoked-token, timeout and provider outage behavior is tested.
- Data deletion and retention behavior is verified.
- The user-facing flow is tested on desktop and mobile.
- Both STABLOCITY CRM and RM handoff paths pass authenticated end-to-end tests.
