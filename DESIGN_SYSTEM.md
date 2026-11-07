# Design system

## Principles

- Quiet confidence: the product should reduce cognitive noise, not add to it.
- Evidence before inference: distinguish recorded facts from generated interpretation.
- One focal point per state: capture, processing or the meeting brief.
- Dense enough for work, spacious enough to scan.
- Consent and recording state must be unmistakable.

## Personality and context

Discreet, precise, calm, slightly mysterious. Desktop-first beside a call window; responsive review on mobile. Visual references in words: editorial typography, field-recorder instrumentation, restrained control-room labeling, and paper-like meeting notes. No copied product UI.

## Color tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0c0e0f` | Page background |
| `--panel` | `#141718` | Main surfaces |
| `--panel2` | `#191d1d` | Secondary surfaces |
| `--text` | `#edf1ec` | Primary text |
| `--muted` | `#8e9994` | Secondary text |
| `--line` | `#2a302f` | Borders and dividers |
| `--accent` | `#c5f277` | Primary action and active signal |
| `--accent-dark` | `#91b64f` | Secondary signal |
| `--red` | `#ef7669` | Recording and destructive warning |

## Typography

- Display/UI: Manrope, 22–68 px, tight tracking for headlines.
- Body: DM Sans, 11–16 px depending on density.
- Instrument labels: DM Mono, 8–10 px, uppercase and tracked.
- Editorial accent: Georgia italic, used sparingly in the hero only.
- External font loading is decorative; system fallback remains usable if unavailable.

## Spacing

Base rhythm: 4 px. Common values: 4, 8, 10, 12, 16, 20, 24, 28, 36, 48, 64 px. Workspace columns use 18 px gap.

## Radius

Mostly square-edged surfaces: 4–5 px controls, 9–12 px small utility panels, circular recording indicator. Avoid card-on-card nesting.

## Elevation

Use borders and tonal shifts before shadows. Shadows only for the floating preferences panel and transient toast.

## Motion

- Recording pulse and waveform are functional state indicators.
- Hover/focus transitions are short and restrained.
- Respect `prefers-reduced-motion`.
- Never animate essential information into view without an accessible static state.

## Components

Top bar, brand mark, privacy indicator, preferences panel, capture form, recording instrument, primary/secondary action, status tag, error alert, empty state, spoken-summary panel, decision list, action list, follow-up draft, history list, toast.

## States

- Empty: tells user what will appear and points to capture.
- Loading/processing: disables conflicting actions and describes current work.
- Error: plain-language explanation and recovery route.
- Success: meeting brief appears, recap is spoken, status toast confirms completion.
- Disabled: reduced opacity and native disabled behavior.
- Recording: red status tag, timer and waveform; browser sharing indicator remains visible.

## Accessibility

Semantic labels, explicit form labels, visible focus ring, native buttons/selects/textarea, `role=alert` for errors, `role=status` for toast, touch-sized primary action, reduced-motion support. The app does not depend on hover to expose essential actions.

## Responsive rules

At 850 px, stack the two workspace columns. At 520 px, reduce page gutters, scale the hero headline, and keep controls full-width. The capture action remains the first major control.

## Do / do not

- Do make recording state impossible to miss.
- Do state that the user must share tab audio.
- Do label generated content as a draft and require review.
- Do not imply autonomous meeting attendance.
- Do not fabricate customers, usage numbers or endorsements.
- Do not use decorative gradients, generic purple SaaS palettes or fake analytics.
