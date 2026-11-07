# Assumptions and product decisions

## Product

- Product name is G.H.O.S.T. (Meeting Ghost Voice). The acronym is treated as a brand, not expanded into a forced phrase.
- The primary buyer is an independent professional or small-team knowledge worker who attends recurring calls and must personally track commitments.
- The primary job is to turn one meeting into a usable recap and next-step list, not to replace a full meeting platform or project-management tool.
- The first meaningful value is the spoken recap plus decisions/actions after one meeting.

## Capture and consent

- “Runs in the background” is interpreted as recording a user-selected, explicitly shared browser tab while the app is open. Browser security prevents silent capture of arbitrary system audio.
- “Joins calls” is not claimed in v1. Autonomous joining requires separate Zoom/Google Meet/Microsoft Teams integrations, OAuth scopes, bot infrastructure, provider approval and platform-specific compliance.
- The UI shows recording state and uses the browser's sharing prompt. Users must disclose recording and obtain consent required by their jurisdiction and workplace.
- Browser tab audio capture is variable across browser/platform combinations. A paste-transcript fallback is provided.

## AI processing

- OpenAI is the default transcription and analysis provider. The API key remains on the server.
- `whisper-1` is the default transcription model; `gpt-4o-mini` is the default structured analysis model. Both can be changed with server environment variables.
- Analysis must not invent names, decisions, owners or due dates. Unknown values should be marked “Not specified.”
- “In your voice” is interpreted as a selectable writing tone, not voice cloning or style training. Browser speech synthesis is used for playback.
- AI output is a draft and requires human review. It is not an authoritative record of the meeting.

## Data and architecture

- No authentication or hosted database is included in v1. Meeting history is stored in local browser storage to reduce setup friction and avoid retaining sensitive recordings on a vendor server.
- Raw audio is sent to the configured transcription endpoint and is not intentionally persisted by this application. The transcription provider's own data handling terms still apply.
- Transcript and generated brief are stored in local storage. Users can delete a brief; clearing browser storage also removes all saved history.
- The current upload limit is 24 MB per meeting recording. Long-meeting chunking and resumable uploads are deferred.

## Monetization

- Proposed $15–29 one-time meeting pack and $39/month unlimited pricing are hypotheses only.
- Checkout, subscription management, usage metering and entitlements are not implemented. It would be misleading to show a working payment flow before identity and entitlement enforcement exist.
- Before billing, test whether professionals repeatedly use the product and whether they prefer per-meeting credits or an unlimited subscription. Measure transcription and analysis costs per recorded hour.

## Design

- Personality: discreet, precise, slightly mysterious, calm under pressure.
- Emotional response: relief and clarity, not surveillance or artificial intimacy.
- Primary use: desktop browser beside a video-call tab; mobile layout supports review and transcript paste.
- Visual language: charcoal surfaces, restrained acid-lime signal color, mono labels, editorial serif accent, compact meeting-brief hierarchy.
- Motion is limited to recording feedback and state transitions. Reduced-motion preference is respected.

## Compliance and limitations

- The app does not provide legal advice about recording consent. Consent obligations vary by location, participant location, employer and platform.
- The app is not certified for regulated health, legal, financial or other sensitive-record use. Do not use it for confidential or regulated conversations without reviewing vendor terms and applicable obligations.
