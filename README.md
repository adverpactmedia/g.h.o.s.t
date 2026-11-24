# G.H.O.S.T.

**Gather. Highlight. Organize. Summarize. Track.**

**Your meetings end. Their decisions don't.**

G.H.O.S.T. turns a recorded conversation or pasted transcript into a structured leadership Meeting Blueprint: confirmed decisions, accountable owners, deadlines, corrections and unresolved issues.

## What G.H.O.S.T. produces

Each Meeting Blueprint includes:

- **Meeting Summary:** the objective, main friction and alignment.
- **Decision Intelligence:** separates confirmed, tentative, reversed and unresolved decisions.
- **Supporting Evidence:** extracts relevant transcript wording and confidence indicators.
- **Verbal Corrections:** shows superseded wording and the replacement where a correction is identified.
- **Confirmed Decisions:** explicit agreements identified in the conversation.
- **Action Items:** tasks, owners and deadlines where stated.
- **Efficiency Meter:** estimated measures based on transcript content, not verified meeting duration.
- **Executive Blueprint:** a concise decision-focused follow-up draft.
- **Client-Facing Delight:** a professional external follow-up draft.
- **Team-Hustle Pulse:** an internal next-steps draft.
- **Original Transcript:** retained with the saved meeting record.
- **Language Selection:** choose the output language for the Blueprint and follow-up drafts; language metadata and a translated transcript are included when returned by the model.

AI-generated content can be incomplete or incorrect. Review every decision, owner, deadline and follow-up before relying on or sending it.

## How it works

1. Enter a meeting title.
2. Choose microphone recording or shared-tab recording.
3. Confirm that participants know recording is taking place.
4. Start recording and grant the browser's requested permissions.
5. Stop recording when the conversation ends.
6. G.H.O.S.T. sends the audio for transcription.
7. Review the transcript.
8. Generate and review the Meeting Blueprint.
9. Copy or export the result.

You can also paste an existing transcript instead of recording.

## Current capabilities

- Browser microphone recording.
- Browser shared-tab audio recording where supported.
- Transcript review before analysis.
- Transcript import by pasting text.
- Gemini-powered transcription and meeting analysis.
- Four writing styles: Direct, Warm, Executive and Casual.
- User-selected Blueprint output language.
- Automatic audio language identification through Gemini transcription.
- Saved meeting history in the current browser.
- Spoken recap using browser speech synthesis.
- Copy and Markdown export.
- Open a generated follow-up draft in the user's email application via a prefilled `mailto:` link.
- Export of the Blueprint with or without the original transcript.
- Delete saved meeting records from the current browser.

## What it does not do

The current version does not:

- Automatically join Zoom, Google Meet, Microsoft Teams or other meetings.
- Intercept phone calls or record every application on a device.
- Guarantee that every speaker or commitment is identified correctly.
- Send follow-up emails directly from G.H.O.S.T. (it can open a prefilled draft in the user's email application).
- Create calendar events or reminders.
- Track whether assigned tasks are completed.
- Sync meeting history between devices.
- Provide shared team workspaces, shared meeting records or team-role permissions. Supabase passwordless email-link sign-in is included in the current candidate, but it must be configured and verified before it is available to users; sign-in does not create cloud-synced meeting history.
- Provide subscription billing.
- Accept MP4/video uploads or standalone audio-file uploads.

Do not assume that a task is being tracked after the Blueprint is generated. The current product creates a record and follow-up drafts; it does not manage task completion.

## Recording and privacy

**Record only with the knowledge and consent required from everyone involved.**

G.H.O.S.T. sends recorded audio to Google's Gemini API for transcription. The resulting transcript is sent to Gemini for analysis.

Meeting history is stored in the current browser's local storage. It is not a cloud-synced archive. Clearing browser storage may permanently remove saved meeting records.

The transcription endpoint sets `store:false` for its synchronous Gemini interaction and attempts to delete the temporary uploaded audio file after processing. The analysis endpoint uses Gemini background interactions with `store:true` so G.H.O.S.T. can poll for the result, then attempts to delete the interaction when it reaches a terminal state. Google documents one-day retention for stored free-tier interactions and 55-day retention for stored paid-tier interactions; abandoned analysis sessions or failed cleanup may remain subject to that provider retention. The free Gemini API tier may use submitted content to improve Google products; the paid API tier says it does not. Audio is still transmitted to Google for processing, so this is not zero-provider-processing.

Do not submit confidential, regulated or sensitive conversations unless you have permission and have reviewed the applicable provider terms and your organization's requirements.

## Technical requirements

- Node.js 20.9 or newer
- npm
- A Google Gemini API key
- The existing Supabase project for shared API quotas and durable internal meeting-event idempotency
- A modern browser
- HTTPS in production

For the most reliable first test of shared-tab audio, use a current desktop Chromium-based browser. Microphone and tab-audio support varies by browser and operating system.

## Local setup

```bash
npm install
cp .env.example .env.local
# Configure GEMINI_API_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; apply both Supabase migrations before production API use


## Private STABLOCITY meeting handoff

The private `POST /api/internal/meetings/analyze` endpoint accepts only signed server-to-server requests from STABLOCITY. It verifies the HMAC over the exact request body, timestamp and event ID, rejects stale or malformed signatures, and enforces a 150 KB request limit.

The development branch includes durable replay-protection code using the G.H.O.S.T. Supabase project. This is not active in production until the PR is merged, `supabase/migrations/20261120_ghost_internal_events.sql` is applied, and `SUPABASE_URL` plus the server-only `SUPABASE_SERVICE_ROLE_KEY` are configured in Vercel. The endpoint fails closed when the event store is not configured. It stores only the event ID, request-body hash, processing state and Gemini interaction ID; it does not store transcripts, Google OAuth tokens or poll tokens. Repeated requests with the same event ID and body return the existing interaction; reuse of an event ID with a different body is rejected.

The sender and receiver remain separate services. STABLOCITY owns Google OAuth, Meet/Pub/Sub access, transcript retrieval and workspace authorization. G.H.O.S.T. processes the transcript and returns a Blueprint. STABLOCITY stores the result in its own workspace database and presents it to the user for review.

## STABLOCITY complimentary companion

G.H.O.S.T. is also made available at no separate charge to STABLOCITY licence holders and users. It remains an optional, separately operated service. It is not installed in STABLOCITY and is never included in the STABLOCITY source-code ZIP or customer handover archive. STABLOCITY users receive access to the hosted G.H.O.S.T. application, not its source code, hosting rights or ownership.

The complimentary companion relationship does not create an uptime, support, retention or service-level guarantee. Reasonable-use controls may be applied. G.H.O.S.T. remains a separate product and development project.

## STABLOCITY handoff status

The desired handoff is a user-initiated Markdown Meeting Blueprint transfer. The user must choose the destination industry workspace and may optionally attach the meeting to a contact, company or deal, or save it at workspace level. STABLOCITY must independently authenticate the user and authorize every destination. The Markdown file is data only and must never grant permissions.

The user-directed Markdown handoff is implemented in the G.H.O.S.T. sender and both STABLOCITY CRM and RM receivers. The receiving import pages are deployed and smoke-checked. The user chooses the workspace and may optionally attach a contact, company or deal. The receiver enforces current workspace write permissions and validates same-workspace references. Full authenticated customer acceptance testing is still pending, and STABLOCITY does not yet enforce per-contract/deal ACLs across every application path.

## External integrations status

Automatic attendance in Zoom, Google Meet or Microsoft Teams, email sending, calendar event creation, task completion tracking and cloud-synced meeting history are not current capabilities. Each requires its own provider registration, OAuth scopes, secure credential storage, callbacks, user consent, data model, error handling and end-to-end verification. Do not advertise these capabilities as available until released and tested.


## STABLOCITY transfer implementation

The Meeting Blueprint screen now includes a Transfer to STABLOCITY action. It asks for the user's own STABLOCITY deployment URL, downloads the reviewed Markdown Blueprint and opens that deployment's /ghost-import page. The user then chooses the destination workspace and may optionally attach the meeting to a contact, company or deal. The receiving STABLOCITY server validates workspace access and same-workspace record references.

The sender and receiver code has been added to the repositories and the import page is deployed on the STABLOCITY CRM and RM demos. This does not yet constitute a full authenticated customer acceptance test. The current STABLOCITY access model is workspace-level, not per-contract/deal ACL. Do not represent it as named-user access control for each contract.

## Additional API protection

Analysis polling now uses a short-lived signed token tied to the Gemini interaction ID. This reduces the risk of another visitor retrieving a poll result using only a guessed or exposed interaction ID. It does not replace user authentication, distributed abuse controls or cloud account permissions.
