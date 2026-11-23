
# G.H.O.S.T. Deployment and Operations

## Requirements

- Node.js 20.9 or newer
- npm
- A Google Gemini API key
- A dedicated Supabase project for shared usage limits
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
SUPABASE_URL=https://your-ghost-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
GHOST_SESSION_SECRET=your-independent-random-secret
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
| `SUPABASE_URL` | Yes in production | Dedicated G.H.O.S.T. Supabase project URL for shared rate limits. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes in production | Server-only key for the private rate-limit RPC. Never expose it to the browser or use a `NEXT_PUBLIC_` prefix. |
| `GHOST_SESSION_SECRET` | Recommended | Independent secret for signed analysis-poll tokens. |

The current application does not use the old OpenAI environment variables.

## AI services

G.H.O.S.T. currently uses Google's Gemini API:

- Audio transcription: `gemini-3.5-transcribe`
- Meeting analysis: `gemini-3.8-flash` through the Interactions API

The transcription endpoint accepts audio uploads up to 4 MB.

The analysis endpoint starts a background interaction. The browser then polls the application for the result.

A successful deployment does not by itself prove that the configured API key, model access, quotas, or billing are working. Test both transcription and transcript analysis after deployment.

## Vercel deployment

1. Open the G.H.O.S.T. project in Vercel.
2. Open Project Settings.
3. Open Environment Variables.
4. Add `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `GHOST_SESSION_SECRET`.
5. Apply them to the Production environment.
6. Apply `supabase/migrations/20261123_ghost_rate_limits.sql` to the dedicated G.H.O.S.T. Supabase project.
7. Confirm the service-role key belongs to that project and remains server-only.
8. Redeploy after changing environment variables.
9. Wait for the deployment to report Ready.
10. Open the production URL over HTTPS.
11. Complete the user-side tests in the launch checklist.

Keep deployment protection enabled during the initial test period.

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

## Security and launch boundary

The current application is an early MVP.

Important limitations:

- API routes do not currently require user authentication.
- Shared rate limiting uses atomic Supabase RPC buckets keyed by HMAC-hashed IP and IP/user-agent values. It fails closed if the Supabase store or trusted Vercel `x-real-ip` header is unavailable.
- This limits anonymous quota abuse but is not user authentication, per-user entitlement enforcement, or protection against distributed IP abuse.
- Anyone who can reach an unprotected deployment may still call AI endpoints within the shared limits.
- There is no account system, user-level quota, payment enforcement, or team access control.

For initial testing, keep the Vercel deployment protected and share access only with intended testers.

Do not expose the application to unrestricted public traffic until authentication or an effective access-control layer and reliable usage limits are in place.

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
