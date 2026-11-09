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
- Accept MP4/video uploads or standalone audio-file uploads.

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