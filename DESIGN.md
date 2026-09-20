# CareLoop product and interface design

Author: Adithya A
Status: canonical product design specification

This document is the source of truth for CareLoop's visual language, interaction character and user-facing content. Implementations may extend it, but must not silently contradict it.

## Product promise

CareLoop helps a care recipient, family members and coordinators maintain one shared understanding of everyday care. It should make coordination feel lighter while preserving warmth, dignity and human connection.

CareLoop is not a medical decision-maker. It coordinates and summarizes; it does not diagnose, prescribe or alter medication.

## Experience principles

1. **Reassuring before efficient.** Make status and next actions clear without making the experience feel clinical or alarming.
2. **One obvious next step.** Each screen should have one primary action. Secondary actions remain visible without competing.
3. **Family language.** Prefer “circle,” “check-in,” “help,” “share” and “today” over institutional terminology.
4. **Review before sharing.** Voice transcripts, generated summaries and mutations must show what will happen before commitment.
5. **Accessible by default.** Large targets, readable type, clear focus and plain language are baseline behavior, not optional modes.
6. **Human moments matter.** Tasks and handoffs coexist with memories, gratitude and everyday wellbeing.

## Canonical palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Warm cream | `--care-cream` | `#FFEDB9` | Gentle panels, selection and supporting emphasis |
| Sun yellow | `--care-sun` | `#FFCB56` | Optimistic highlights, avatars and positive status |
| Peach | `--care-peach` | `#FFA259` | Focus, active accents and transitional emphasis |
| Coral | `--care-coral` | `#FF7E7E` | Primary actions and affectionate emphasis |
| Canvas | `--care-canvas` | `#FFFAF0` | Page background |
| Surface | `--care-surface` | `#FFFDF8` | Cards, forms and elevated content |
| Warm ink | `--care-ink` | `#3D302B` | Primary text and dark navigation |
| Muted warm text | `--care-muted` | `#74655F` | Supporting copy |
| Border | `--care-border` | `#EADFCE` | Quiet dividers and controls |
| Success | `--care-success` | `#5F8F72` | Confirmed completion, never decoration alone |

Do not add violet, purple, indigo or cool neon hues. Never communicate state by color alone. New colors require a documented semantic role, accessible contrast verification and an update to design-system tokens.

## Typography and voice

- Use the rounded system stack defined by `--care-font`; avoid adding a font dependency without a measured need.
- Page titles are warm and direct, normally one sentence or less.
- Supporting text explains the outcome, not the implementation.
- Use sentence case. Avoid exclamation-heavy copy, medical jargon, blame and urgency inflation.
- Never say the AI “knows” a person's condition. Attribute summaries to their source and time.
- Safety guidance should be calm, explicit and adjacent to the relevant action.

## Shape, spacing and elevation

- Cards use soft rounded corners: 20–30px for primary surfaces, 12–18px for compact controls.
- Primary actions are pill-shaped or strongly rounded and use coral with warm-ink text.
- Use the existing warm shadow sparingly for major elevated surfaces only.
- Keep touch targets at least 44×44 CSS pixels; prefer 48px for high-frequency and older-adult flows.
- Favor whitespace and small groups over dense dashboards. A card should represent one thought or decision.

## Component rules

### Buttons

- One visually dominant primary button per decision region.
- Button labels begin with a clear verb: “Share check-in,” “Create circle,” “Review handoff.”
- Destructive actions require distinct wording and confirmation; do not reuse coral as an ambiguous destructive cue.

### Forms

- Labels remain visible above fields; placeholders are examples, never the only label.
- Show validation next to the field and describe how to recover.
- Preserve entered values after recoverable errors.
- Health-adjacent inputs state how information will be used and who can see it.

### Cards and lists

- Use cards for summaries and focused choices; use lists for repeated records.
- Repeated rows expose status, ownership and time in the same relative position.
- Empty states explain what belongs here and offer a safe next action.

### Voice and generated content

- Distinguish listening, processing, reviewing, confirmed and failed states.
- Always provide a non-voice alternative.
- Display the transcript or structured result before a write occurs.
- Generated summaries show sources or the time window summarized.

## Screen contracts

| Screen group | Required outcome |
| --- | --- |
| Welcome and onboarding | Explain CareLoop simply; create or join a circle; capture only necessary profile and accessibility choices |
| Care-recipient home | Reassure first; show today, the next family contact and a prominent voice action |
| Family home | Show shared status, attention items and ownership without surveillance language |
| Voice | Make recording state unmistakable and require review before sharing |
| Tasks | Show owner, due time and status; make unassigned work visible |
| Timeline and handoffs | Preserve chronology, attribution, source and outstanding actions |
| MemoryBox | Prioritize the memory and contributor; keep operational UI secondary |
| Circle | Show membership, role and declared availability without implying guaranteed availability |
| Wellbeing | Treat mood as a personal check-in, not a diagnosis or risk score |
| Settings | Make permissions, notifications, accessibility, privacy and safety easy to find |

## Responsive behavior

- Design mobile-first for one-handed use, then expand rather than merely stretch.
- Primary navigation may become a bottom bar on small screens and a rail/header on larger screens.
- Two-column layouts collapse in reading order; critical actions must not move after unrelated content.
- Avoid horizontal scrolling for product content at 320px width.

## Accessibility acceptance criteria

- All functionality is keyboard operable with a visible focus indicator.
- Inputs have programmatic labels; icon-only controls have accessible names.
- Heading levels describe document structure in order.
- Status changes are announced appropriately and are not communicated by color alone.
- Text can enlarge to 200% without loss of content or function.
- Reduced-motion preferences are respected for non-essential animation.
- Contrast meets WCAG AA for the actual text size and weight used.

## Implementation source of truth

- Tokens: `packages/design-system/src/tokens.css`
- Reusable React primitives: `packages/design-system/src/index.tsx`
- Product screens: `apps/web/src/pages`
- Web-specific execution rules: `apps/web/AGENTS.md`

If code and this document disagree, pause and resolve the discrepancy deliberately. Do not create an unofficial parallel design system.
