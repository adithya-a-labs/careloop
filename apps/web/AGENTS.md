# Web application agent guide

Author: Adithya A
Scope: `apps/web/**`

Use the `careloop-web-ui` skill for screen, interaction, responsive or accessibility work. Read root `DESIGN.md` before changing user-facing behavior.

## Responsibilities

- Route composition, screen behavior, frontend state and safe API consumption.
- Accessible, responsive implementation of the canonical CareLoop design.
- Role-aware experiences for care recipients, family members and coordinators.

## Boundaries

- Do not place service-role, LLM or other privileged credentials in browser code.
- Do not call provider APIs directly from the browser.
- Do not invent API response shapes in several screens. Define a shared client contract or coordinate with `apps/api` and `packages/shared`.
- Keep product features in `src/features`; reusable, product-neutral UI belongs in `packages/design-system`.
- Do not use generated clinical conclusions or medication actions as frontend shortcuts.

## Interaction requirements

- Every async screen represents loading, empty, success and recoverable-error states.
- Mutating voice or generated actions show a review state before confirmation.
- Icon-only controls have accessible names; forms have persistent labels and useful errors.
- Use tokens from `@careloop/design-system`; no purple or unapproved parallel token set.
- Keep mobile navigation and the demo role switcher usable at narrow widths.

## Verification

Run `pnpm --filter @careloop/web typecheck` and `pnpm --filter @careloop/web build`. Add focused tests when behavior changes. For visual changes, inspect mobile and desktop layouts plus keyboard focus behavior.
