
# G.H.O.S.T. Deployment and Operations

## Requirements

- Node.js 20.9 or newer
- npm
- A Google Gemini API key
- A Vercel project connected to this repository
- HTTPS for production browser audio capture

## Local development

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

Never commit `.env.local`. Never expose the API key through a `NEXT_PUBLIC_` variable.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | Yes | Server-side key used for audio transcription and meeting analysis. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Dedicated G.H.O.S.T. Supabase project URL used by Supabase Auth. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase publishable/anon key for browser and server session handling. |
| `SUPABASE_URL` | Yes | Same dedicated G.H.O.S.T. project URL for server-only database operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only service-role key for rate limits and internal event storage. Never expose it to browser code. |
| `SUPABASE_URL` | Yes for production API use | Existing Supabase project URL for shared atomic rate limits and durable internal-event claims. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for production API use | Server-only service-role key; never expose to browser code. |
| `STABLOCITY_GHOST_WEBHOOK_SECRET` | Optional until STABLOCITY handoff is enabled | Shared secret (32+ characters) for HMAC-authenticated STABLOCITY transcript submissions. |

The sign-in flow uses Supabase passwordless email links. In Supabase Authentication settings, enable email OTP/magic links and add the exact callback URLs for the production domain, the intended Vercel preview domain, and local development (for example `https://g-h-o-s-t-drab.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`). Do not add broad wildcard redirect URLs.

The current application does not use the old OpenAI environment variables.

**Gemini free-tier data warning:** audio and transcripts submitted to G.H.O.S.T. are sent to Google's Gemini API for transcription and analysis. Google's current Gemini Developer API pricing documentation states that free-tier content is used to improve Google products. Use synthetic meeting data for free-tier testing. Do not submit confidential customer, employee, legal, financial or commercially sensitive meetings through the free tier unless all required participants have been informed, the customer has reviewed Google's applicable terms and the customer has explicitly approved that transfer. Do not describe the free tier as zero-retention or as excluded from provider model improvement. See https://ai.google.dev/gemini-api/docs/pricing/.

## AI services

G.H.O.S.T. currently uses Google's Gemini API:

- Audio transcription: `gemini-3.5-transcribe`
- Meeting analysis: `gemini-3.8-flash` through the Interactions API

The transcription endpoint accepts audio uploads up to 4 MB.

The analysis endpoint starts a background interaction. The browser then polls the application for the result.

A successful deployment does not by itself prove that the configured API key, model access, quotas, or billing are working. Test both transcription and transcript analysis after deployment.

The development branch adds a private `POST /api/internal/meetings/analyze` endpoint for transcript submissions from STABLOCITY. It verifies an HMAC-SHA256 signature over the exact JSON body, timestamp and event ID, then returns the normal G.H.O.S.T. analysis task ID and poll token. The branch also includes a Supabase event ledger and an atomic shared rate-limit function. Before enabling the APIs, apply both SQL migrations in `supabase/migrations/` to the existing G.H.O.S.T. Supabase project and configure `SUPABASE_URL` plus the server-only `SUPABASE_SERVICE_ROLE_KEY` in Vercel. The public analysis and transcription routes fail closed if the shared quota store is unavailable; they do not fall back to process-local limits. Configure `STABLOCITY_GHOST_WEBHOOK_SECRET` and the matching `GHOST_WEBHOOK_SECRET` on STABLOCITY. Never expose these secrets to browser code. The bridge is not itself connected to Meet event subscriptions or Pub/Sub.

## Vercel deployment

1. Open the G.H.O.S.T. project in Vercel.
2. Open Project Settings.
3. Open Environment Variables.
4. Add `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GHOST_SESSION_SECRET` and `STABLOCITY_GHOST_WEBHOOK_SECRET` only in the environments where each integration is enabled.
5. Apply the SQL migrations in `supabase/migrations/` to the dedicated G.H.O.S.T. Supabase project.
6. Configure the Supabase Auth email provider and exact redirect URLs.
7. Keep the service-role and webhook secrets server-only.
8. Redeploy after changing environment variables.
9. Wait for the deployment to report Ready.
10. Test sign-in, sign-out, API denial without a session, and successful authenticated requests.
11. Open the production URL over HTTPS and complete the remaining launch checklist.

Keep deployment protection enabled during the initial test period. **Current project check (2026-11-22):** password, SSO and trusted-IP protection are disabled in the Vercel project. Treat branch preview URLs as publicly reachable; do not share them with customers or place production secrets in Preview environment scope. The public production domain remains on the `main` branch. If private preview testing is required, enable Preview-only protection before sharing preview URLs.

## Browser recording requirements

G.H.O.S.T. uses browser-supported media capture.

- The user must explicitly start capture.
- The user must select the appropriate tab or microphone source.
- Tab audio must be enabled in the browser's sharing prompt.
- Browser and operating-system support varies.
- G.H.O.S.T. does not automatically join meetings.
- G.H.O.S.T. does not intercept cellular calls or capture audio from every application.

Use a current desktop Chromium-based browser for the first production recording test.

## Data handling and privacy

- Meeting history is stored in the current browser's local storage.
- History is not cloud-synced between devices.
- Clearing browser storage can delete saved meeting history.
- Audio is sent to Google's Gemini API for transcription.
- The resulting transcript is sent to Gemini for meeting analysis.
- The transcription route attempts to delete its temporary uploaded Gemini file after processing.
- The analysis route currently requests stored background interactions.

Do not describe the service as zero-retention, encrypted cloud storage, or compliant with a particular privacy law unless those claims have been independently verified.

Users must obtain all required participant consent and must not submit confidential conversations unless they have permission and have reviewed the relevant provider terms.

## Authentication and access control

- The app pages require a verified Supabase Auth session.
- The public analysis, transcription and meeting-assistant APIs require a verified signed-in user.
- Analysis, transcription and assistant quotas include an HMAC-hashed user identifier as well as hashed IP/device buckets.
- The private STABLOCITY webhook remains separate and requires its own HMAC signature over the exact request body, event ID and timestamp.
- The analysis polling endpoint uses a short-lived bearer capability bound to one Gemini interaction ID. Treat that token as a secret.
- Meeting history remains in browser local storage. Authentication does not yet create cloud sync, shared workspaces, team roles, or server-side meeting ownership.

The Supabase service-role key is used only by server-side code for the private rate-limit and internal-event operations. It must never be included in browser bundles or environment variables prefixed with `NEXT_PUBLIC_`.

## Security and launch boundary

The current application is an early MVP.

Important limitations:

- Authentication code is present in the candidate branch but is not active until the Supabase public URL/key, server-only service-role key and email redirect configuration are supplied and verified.
- Shared atomic Supabase quotas enforce hashed IP/device/user buckets; this is a cost-control layer, not proof against distributed abuse or VPN rotation.
- If Supabase is missing or unavailable, public AI requests fail closed before provider work begins.
- There is no cloud meeting history, workspace isolation, team-role model, payment enforcement or per-plan entitlement system.

For initial testing, keep the Vercel deployment protected and share access only with intended testers.

Keep Vercel deployment protection enabled during integration testing. Do not expose the application to unrestricted public traffic until the Supabase migrations are applied, deployed quota enforcement is verified, and an additional access-control or anti-abuse gate is selected for the public-free product.

## Production verification

Run these checks before accepting the deployment:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Then test the deployed application:

1. Open the app.
2. Import a transcript.
3. Generate a Meeting Blueprint.
4. Confirm the summary, decisions, action items, efficiency estimates, and all three follow-up drafts render.
5. Refresh the page and confirm saved history behaves as expected.
6. Copy and export the Blueprint.
7. Test a short audio recording.
8. Confirm transcription completes and the resulting transcript can be reviewed.
9. Confirm a failed request displays a useful error and does not erase the transcript.

## Rollback

If a deployment fails:

1. Open Vercel Deployments.
2. Identify the last known-good deployment.
3. Promote that deployment to Production.
4. Re-test the production URL.

A rollback does not restore browser local storage that a user has cleared or lost.

## Current release scope

The initial release is limited to:

- Browser-based audio capture
- Transcript review and editing
- AI-generated Meeting Blueprints
- Saved browser-local meeting history
- Copy and Markdown export
- Spoken recap where browser speech synthesis is supported

The following are not currently included:

- User accounts
- Cloud-synced meeting history
- Team workspaces
- Automatic meeting-platform joining
- Calendar or CRM integrations
- Email sending
- Task reminders or completion tracking
- Subscription billing

Do not advertise unavailable capabilities as current product features.
