# Assumptions and Product Decisions

## Product

- Product name: G.H.O.S.T.
- Acronym: Gather. Highlight. Organize. Summarize. Track.
- Tagline: Your meetings end. Their decisions don't.
- The primary job is to turn a meeting transcript or recording into a structured Meeting Blueprint.
- The Blueprint is an AI-generated draft. Users must review it before relying on it.
- G.H.O.S.T. is not a replacement for a meeting platform, project-management system, or human decision-maker.

## Capture and Consent

- Microphone recording requires browser permission.
- Meeting-tab recording requires browser screen/tab sharing and enabled tab audio.
- Browser security prevents silent capture of arbitrary system audio.
- G.H.O.S.T. does not directly intercept cellular calls.
- G.H.O.S.T. does not autonomously join Zoom, Google Meet, or Microsoft Teams calls.
- Users must disclose recording and obtain consent required by applicable law and workplace policy.
- Browser audio capture varies by browser and device.
- Transcript paste is the fallback when recording is unavailable.

## AI Processing

- Google Gemini is the current AI provider.
- The server-side environment variable `GEMINI_API_KEY` is required.
- Audio transcription uses `gemini-3.5-transcribe`.
- Meeting analysis uses `gemini-3.8-flash` through the Gemini Interactions API.
- Analysis runs as a background interaction and the application polls for completion.
- The application requests structured JSON containing:
  - Meeting summary
  - Objective, friction and alignment
  - Confirmed decisions
  - Action items, owners and deadlines
  - Estimated efficiency indicators
  - Three follow-up drafts
- The analysis prompt treats transcript content as untrusted source material.
- Suggestions must not be represented as confirmed decisions.
- Unknown owners and deadlines must not be invented.
- AI output must be reviewed by the user.

## Efficiency Indicators

- Transcript volume is estimated from transcript content.
- Actionable velocity and non-actionable content are estimates.
- Transcript text cannot establish actual meeting duration.
- The application must not claim verified minutes saved.
- These indicators are directional, not audited business metrics.

## Data and Architecture

- The current application has no user accounts.
- There is no hosted meeting database or cloud-synced history.
- Meeting history is stored in the browser's local storage.
- Clearing browser storage can remove saved meeting history.
- Local storage is not an encrypted archive.
- Audio is uploaded to Google Gemini for transcription.
- The application attempts to delete the temporary Gemini audio file after processing.
- Transcript analysis uses the Gemini Interactions API with `store: true`.
- Do not claim zero retention or guaranteed deletion of all provider-side data.
- Review Google's applicable data terms before submitting sensitive material.
- Current maximum audio upload size: 4 MB.
- Long-recording chunking and resumable application-level uploads are not implemented.

## Security Boundary

- API endpoints currently do not implement user authentication.
- Rate limiting currently uses process-local memory.
- Process-local rate limiting is not reliable as a complete production abuse-prevention system in a serverless environment.
- Keep the Vercel deployment protected during testing.
- Do not open the application to unrestricted public use until authentication or effective access control and reliable usage limits are implemented.
- Never expose `GEMINI_API_KEY` through a `NEXT_PUBLIC_` environment variable.

## Monetization

- Proposed one-time meeting packs and monthly subscriptions are unvalidated pricing hypotheses.
- Checkout, subscription management, usage metering and entitlement enforcement are not implemented.
- Do not present payment as a working product capability.
- Validate recurring usage and willingness to pay before implementing billing.
- Measure transcription and analysis costs per completed meeting before setting final pricing.

## Product Limitations

- No team workspaces.
- No shared cloud archive.
- No task completion tracking.
- No task assignment system.
- No reminders or notifications.
- No calendar, CRM, email or project-management integrations.
- No autonomous meeting attendance.
- No regulated-industry compliance certification.
- No guarantee that AI-generated decisions or action items are correct.

## Design

- Personality: discreet, precise, calm and professional.
- Avoid surveillance language and artificial intimacy.
- Primary workflow: capture or import, process, review and export.
- Mobile supports review and transcript entry.
- Desktop is the preferred environment for meeting-tab capture.
- Motion should communicate recording and processing states clearly.
- Respect reduced-motion preferences.

## Compliance and Limitations

- G.H.O.S.T. does not provide legal advice about recording consent.
- Consent requirements depend on jurisdiction, participant location, workplace policy and platform.
- Do not use the current application for confidential or regulated conversations without reviewing applicable obligations and provider terms.
- Do not claim PIPEDA compliance, HIPAA compliance or other certification without a verified assessment.