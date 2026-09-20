---
name: careloop-web-ui
description: Build or revise CareLoop React screens, components, interactions, responsive layouts, accessibility, frontend state, and design-system primitives. Use for work in apps/web or packages/design-system; do not use for backend-only or database-only tasks.
metadata:
  author: Adithya A
  short-description: Build the CareLoop web experience
---

# CareLoop web UI

Author: Adithya A

Deliver a coherent family-first interface that follows the canonical design rather than creating screen-specific styling conventions.

## Required context

Read root `AGENTS.md`, [`DESIGN.md`](../../../DESIGN.md), `apps/web/AGENTS.md`, and `packages/design-system/AGENTS.md` when touching shared primitives. Inspect the existing route, neighboring screen, tokens and API client before editing.

## Implementation workflow

1. State the role, screen outcome and primary action.
2. Reuse tokens and primitives; extend the design system only for repeated, product-neutral behavior.
3. Keep feature-specific state and components in the relevant `src/features` area. Keep route assembly thin.
4. Represent loading, empty, success, recoverable error and permission-denied states where the data flow can reach them.
5. Use typed API boundaries. Do not embed privileged keys, provider calls or invented response shapes.
6. For voice or generated writes, implement capture → processing → review → confirmation → result, with a non-voice alternative.

## Visual and accessibility invariants

- Use only approved warm tokens; no violet, purple, indigo or cool neon hues.
- Keep one dominant action per decision region and use plain family-oriented language.
- Maintain 44px minimum targets, visible focus, semantic headings, persistent labels and accessible icon names.
- Do not encode state through color alone. Verify actual text contrast and keyboard order.
- Test narrow mobile width, a wider layout, text enlargement and reduced motion for meaningful animation.

## Verification

Run the web typecheck and production build. Add or update focused tests for behavioral changes. Inspect user-facing changes visually and report the viewports and interaction states checked. Never present an unimplemented integration as working.
