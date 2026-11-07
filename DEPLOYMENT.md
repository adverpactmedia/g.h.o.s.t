# Deployment and operations

## Local development

```bash
npm install
cp .env.example .env.local
# Add OPENAI_API_KEY
npm run dev
```

Use Node.js 20.9 or newer. Tab capture requires localhost or HTTPS and a browser that supports `getDisplayMedia` audio capture.

## Environment

- `OPENAI_API_KEY`: server-only API credential; required for transcription and analysis.
- `OPENAI_TRANSCRIPTION_MODEL`: optional, defaults to `whisper-1`.
- `OPENAI_ANALYSIS_MODEL`: optional, defaults to `gpt-4o-mini`.

Never prefix the API key with `NEXT_PUBLIC_`. Never commit `.env.local`.

## Database migrations

No database or migrations are part of v1. Meeting history is stored in local browser storage. If cloud sync is added, introduce an explicit schema, account ownership, authorization tests, retention policy and export/delete controls before storing transcripts server-side.

## Vercel deployment

1. Push the repository to GitHub.
2. Import the repository into Vercel as a Next.js project.
3. Add `OPENAI_API_KEY` as a server environment variable. Add model overrides only if needed.
4. Deploy and verify the homepage and API configuration behavior.
5. Test tab capture on the production HTTPS domain using a supported browser.
6. Redeploy whenever environment variables change.

## Custom domain

Attach the domain in Vercel project settings and configure the DNS records Vercel provides. Confirm HTTPS is active before testing screen capture.

## Rollback

Use Vercel Deployments to promote the last known-good deployment. Keep environment variables compatible between releases. Because local history is browser-side, rolling back the app does not migrate or restore local data.

## Security checklist

- [ ] Keep `OPENAI_API_KEY` server-side and rotate it if exposed.
- [ ] Add authentication or an access gate before public launch. Current API routes are unauthenticated and can incur provider costs.
- [ ] Add per-user/IP rate limits and request quotas before public launch.
- [ ] Consider upload limits, duration limits and abuse monitoring.
- [ ] Review OpenAI data processing/retention terms for the intended customer segment.
- [ ] Do not use for regulated or confidential calls until compliance and contractual requirements are reviewed.
- [ ] Explain recording consent responsibilities to every user.
- [ ] Provide data export and deletion controls before cloud storage is introduced.
- [ ] Verify dependency updates and production logs do not contain transcripts or secrets.

## Production readiness boundary

This repository is a deployable MVP, not a fully hardened public SaaS. In particular, unauthenticated AI endpoints must not be exposed to unrestricted public traffic. Before a paid launch, add authentication, rate limiting, account-scoped entitlements, usage metering, payment webhooks, privacy/retention controls, long-recording recovery and jurisdiction-specific legal review.
