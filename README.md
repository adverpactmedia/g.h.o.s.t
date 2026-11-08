# G.H.O.S.T. — Meeting Ghost Voice

### Record only with everyone's knowledge and consent. Your saved history stays in this browser. Audio and transcripts are sent to Google's Gemini API to generate your brief. Do not submit confidential conversations unless you have permission and have reviewed the provider's data terms. ###

**Your meetings leave. Their decisions don't.** G.H.O.S.T. turns a meeting recording or pasted transcript into a concise spoken recap, explicit decisions, action items and a follow-up draft in your preferred writing style.

## What it does

G.H.O.S.T. is a local-first meeting companion. In the browser MVP, the user explicitly shares a meeting tab with tab audio enabled. The app records that shared audio, sends it to the server for transcription, asks the analysis model to produce a structured meeting brief, and reads the short recap aloud using the browser's speech synthesis. Users can also paste an existing transcript. Meeting history is stored in the current browser's local storage.

It is for consultants, independent professionals, managers and small teams who leave calls with more commitments than they can reliably remember.

## Core workflow

1. Enter a meeting title.
2. Select **Share meeting tab & start** and choose the call tab with **Share tab audio** enabled.
3. End the recording when the meeting is over (or stop sharing the tab).
4. G.H.O.S.T. transcribes the audio and extracts summary, decisions, action items and a follow-up draft.
5. The browser speaks the recap. Review, copy or export the brief.

A transcript can be pasted instead of recording. This is useful for platforms that provide their own transcript or where tab capture is unavailable.

## Features

- Explicit browser tab/audio capture using `getDisplayMedia` and `MediaRecorder`.
- OpenAI speech transcription and structured meeting analysis.
- Spoken summary using built-in browser speech synthesis.
- Four follow-up writing styles: Direct, Warm, Executive and Casual.
- Local meeting history, Markdown export, copy follow-up, and deletion.
- Responsive dark interface and reduced-motion support.

## Screenshots

Run the app locally and capture the landing/workspace at desktop and mobile widths. Store approved screenshots in `docs/screenshots/` and link them here. No customer screenshots or testimonials are included by default.

## Local setup

Requirements: Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local
# Add OPENAI_API_KEY to .env.local
npm run dev
```

Open http://localhost:3000. Use a recent Chromium-based browser for the most reliable tab-audio capture. The application must be served from localhost or HTTPS for screen capture permissions.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `OPENAI_API_KEY` | Yes for AI features | Server-side key for transcription and analysis. Never expose it as `NEXT_PUBLIC_*`. |
| `OPENAI_TRANSCRIPTION_MODEL` | No | Defaults to `whisper-1`. |
| `OPENAI_ANALYSIS_MODEL` | No | Defaults to `gpt-4o-mini`. |

If the key is missing, the interface remains usable but transcription and analysis endpoints return a clear configuration error.

## Data, authentication and payments

Version 1 does not require an account, hosted database, or payment provider. Meeting history and the writing-style preference live in the browser only. Clearing browser storage deletes that history. There is no cross-device sync, team workspace, hosted transcript archive, user identity, or billing entitlement in this version.

Payments are intentionally not wired into the first build. The proposed $15–29 meeting pack and $39/month unlimited pricing are hypotheses, not validated demand or an implemented checkout. Validate willingness to pay and real usage before introducing billing. A production paid release should add authenticated accounts, server-side entitlements, usage metering, deletion/export controls, and Stripe Checkout plus verified webhooks.

## Database setup

No database is required. Local storage is used for saved briefs. This is a deliberate MVP trade-off, not a claim that browser storage is suitable for a multi-user SaaS archive.

## Deployment

Deploy as a Next.js project to Vercel or another Node-compatible host. Set `OPENAI_API_KEY`, `OPENAI_TRANSCRIPTION_MODEL` (optional), and `OPENAI_ANALYSIS_MODEL` (optional) in server environment variables. Redeploy after changing environment variables.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for operational details and limitations.

## Project structure

```text
src/app/                 Next.js routes, page, global styles
src/app/api/transcribe/  Audio transcription endpoint
src/app/api/analyze/     Structured meeting analysis endpoint
src/components/          Main product interface
src/lib/                 Validation and formatting helpers
src/types/               Shared domain types
tests/                   Unit tests
public/                  Static assets
```

## Known limitations

- This is a browser capture workflow, not a bot that autonomously joins Zoom, Meet or Teams.
- Tab audio capture depends on browser support and the user's explicit sharing selection. Some browsers/platforms may not provide audio.
- One uploaded recording is limited to 24 MB. Very long meetings may exceed this limit.
- No speaker diarization or guaranteed speaker identity is provided. Do not infer who owns an action unless the transcript supports it.
- Browser speech synthesis voices vary by operating system and browser; this is not a cloned voice.
- No hosted storage, account system, team sharing, subscription enforcement, calendar integration, or CRM/email sending.
- AI output can omit, misattribute or misunderstand statements. Users must verify decisions and commitments before sending follow-ups.
- Recording laws, workplace policies and consent requirements vary. The user is responsible for obtaining all required consent.

## Roadmap

1. Validate repeated use and willingness to pay with a narrow professional cohort.
2. Add reliable long-meeting chunking and transcript recovery.
3. Add user accounts, encrypted cloud sync and retention/deletion controls only if users require cross-device access.
4. Add calendar and meeting-platform integrations where platform APIs and permissions support them.
5. Add paid meeting packs/subscriptions after usage and costs are measured.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npx playwright test
npm run build
```

The Playwright smoke test checks the first-run capture interface and transcript-import path. It does not exercise live audio capture or external AI calls; those require a real browser permission prompt and a configured API key.
