
# G.H.O.S.T.

**Gather. Highlight. Organize. Summarize. Track.**

**Your meetings leave. Their decisions don't.**

G.H.O.S.T. turns a recorded conversation or pasted transcript into a structured Meeting Blueprint, so important decisions, action items and follow-ups are easier to find after the meeting ends.

## What G.H.O.S.T. produces

Each Meeting Blueprint includes:

- **Meeting Summary:** the objective, main friction and alignment.
- **Confirmed Decisions:** explicit agreements identified in the conversation.
- **Action Items:** tasks, owners and deadlines where stated.
- **Efficiency Meter:** estimated measures based on transcript content, not verified meeting duration.
- **Executive Blueprint:** a concise decision-focused follow-up draft.
- **Client-Facing Delight:** a professional external follow-up draft.
- **Team-Hustle Pulse:** an internal next-steps draft.
- **Original Transcript:** retained with the saved meeting record.

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
- Saved meeting history in the current browser.
- Spoken recap using browser speech synthesis.
- Copy and Markdown export.
- Export of the Blueprint with or without the original transcript.
- Delete saved meeting records from the current browser.

## What it does not do

The current version does not:

- Automatically join Zoom, Google Meet, Microsoft Teams or other meetings.
- Intercept phone calls or record every application on a device.
- Guarantee that every speaker or commitment is identified correctly.
- Send follow-up emails.
- Create calendar events or reminders.
- Track whether assigned tasks are completed.
- Sync meeting history between devices.
- Provide user accounts or team workspaces.
- Provide subscription billing.

Do not assume that a task is being tracked after the Blueprint is generated. The current product creates a record and follow-up drafts; it does not manage task completion.

## Recording and privacy

**Record only with the knowledge and consent required from everyone involved.**

G.H.O.S.T. sends recorded audio to Google's Gemini API for transcription. The resulting transcript is sent to Gemini for analysis.

Meeting history is stored in the current browser's local storage. It is not a cloud-synced archive. Clearing browser storage may permanently remove saved meeting records.

The transcription endpoint attempts to delete the temporary uploaded Gemini audio file after processing. The analysis endpoint uses Gemini background interactions with storage enabled. Do not interpret this as a zero-retention guarantee.

Do not submit confidential, regulated or sensitive conversations unless you have permission and have reviewed the applicable provider terms and your organization's requirements.

## Technical requirements

- Node.js 20.9 or newer
- npm
- A Google Gemini API key
- A modern browser
- HTTPS in production

For the most reliable first test of shared-tab audio, use a current desktop Chromium-based browser. Microphone and tab-audio support varies by browser and operating system.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Add your Gemini API key to `.env.local`:

```bash
GEMINI_API_KEY=your_gemini_api_key
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000.

Never commit `.env.local`. Never expose the API key using a `NEXT_PUBLIC_` variable.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | Yes | Server-side credential for transcription and meeting analysis. |

## AI services

The current application uses Google's Gemini API:

- Audio transcription: `gemini-3.5-transcribe`
- Meeting analysis: `gemini-3.8-flash` through the Interactions API

Audio uploads are limited to 4 MB.

Meeting analysis runs as a background interaction. The application polls for completion rather than holding one long-running request open.

Actual model availability, account permissions, quotas and billing depend on the configured Google AI account.

## Data storage

No application database is currently required.

Saved meetings are stored in browser local storage. This means:

- Records are available only in the browser profile where they were saved.
- Records do not automatically appear on another device.
- Clearing site data can remove saved records.
- Browser storage is not a secure document archive.
- Users should export important records and store them appropriately.

## Deployment

G.H.O.S.T. is a Next.js application and is deployed through Vercel.

Add `GEMINI_API_KEY` to the Vercel Production environment variables and redeploy after changing it.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment steps, operational limitations and verification checks.

## Security and launch limitations

This is an early MVP, not a hardened public SaaS.

- API endpoints do not currently require user authentication.
- The current rate limiter uses process memory and is not reliable distributed abuse protection.
- Unrestricted public access could allow other visitors to generate Gemini API usage.
- There are no user-level quotas or billing controls.

Keep deployment protection enabled for initial testing. Do not expose the application to unrestricted public traffic until appropriate access control and reliable usage limits are implemented.

## Quality checks

Run the following commands before deployment:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The automated tests do not replace real browser testing. Verify transcript import, AI analysis, recording permissions, transcription, saving, export and error handling on the deployed application.

## Project structure

```text
src/app/                 Next.js pages, styles and API routes
src/app/api/transcribe/  Audio transcription endpoint
src/app/api/analyze/     Meeting analysis endpoint
src/components/          Main G.H.O.S.T. interface
src/lib/                 Validation, formatting and rate limiting
src/types/               Shared meeting types
tests/                   Automated tests
public/                  Static assets
```
