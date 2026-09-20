---
name: careloop-product
description: Define or refine CareLoop product behavior, user journeys, acceptance criteria, UX copy, feature scope, and non-clinical safety boundaries. Use for product decisions and cross-feature behavior; do not use for an implementation-only change whose behavior is already specified.
metadata:
  author: Adithya A
  short-description: Shape safe CareLoop product behavior
---

# CareLoop product

Author: Adithya A

Keep CareLoop a warm, family-first coordination product rather than a clinical system or generic task manager.

## Start with the source of truth

Read the repository root `AGENTS.md`, [`DESIGN.md`](../../../DESIGN.md), [`docs/safety-boundaries.md`](../../../docs/safety-boundaries.md), and relevant entries in [`docs/DECISIONS.md`](../../../docs/DECISIONS.md). Read existing screens and contracts before proposing new ones.

## Frame the behavior

For each requested behavior, establish:

1. Primary role: care recipient, family member or coordinator.
2. User outcome and the anxiety or coordination burden being reduced.
3. Source of information, audience, visibility and retention expectations.
4. Main action, review/confirmation point and recoverable failure path.
5. Whether the behavior is a care event, task, schedule item, handoff, memory, availability statement or wellbeing check-in.

Do not expand the feature beyond the user's request. Prefer the smallest end-to-end behavior that can be demonstrated honestly.

## Preserve product boundaries

- CareLoop coordinates and summarizes; it does not diagnose, prescribe or alter medication.
- Wellbeing is subjective self-reporting, not scoring, triage or clinical assessment.
- Availability is declared availability, not a guaranteed commitment.
- Generated summaries retain attribution, time range and unresolved items.
- Voice and generated mutations require review and confirmation.
- Urgent-risk copy directs people to qualified local help without inventing clinical instructions.

## Produce implementation-ready decisions

Define clear acceptance criteria covering role, permissions, happy path, empty/loading/error states, confirmation, accessibility and safety. Name affected ownership areas and contracts. Update canonical docs or the decision log when a choice will constrain future work.

Do not create a second source of truth when `DESIGN.md`, shared contracts or an accepted decision already covers the question.
