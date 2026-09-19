---
name: careloop-quality
description: Verify, review, or prepare CareLoop changes for handoff or release through risk-based tests, diff inspection, accessibility checks, safety checks, and regression analysis. Use when asked to test, review, validate, finish, or assess readiness; do not use as a substitute for implementing requested changes.
metadata:
  author: Adithya A
  short-description: Verify CareLoop changes and readiness
---

# CareLoop quality

Author: Adithya A

Provide evidence proportional to the risk of the change. Do not treat a successful build as proof of authorization, accessibility or user behavior.

## Establish the review surface

Read root `AGENTS.md`, the closest area guide, [`docs/TESTING.md`](../../../docs/TESTING.md), and the task acceptance criteria. Inspect the diff and identify affected roles, contracts, data boundaries, safety behavior and UI states.

## Verification order

1. Inspect for secrets, real personal data, generated files and unrelated edits.
2. Run the smallest static checks that cover changed packages.
3. Exercise focused unit or contract behavior.
4. For data changes, validate migration application and RLS allow/deny cases.
5. For UI changes, inspect keyboard operation, focus, labels, mobile/wide layouts, contrast and relevant async states.
6. For voice or AI changes, test refusal boundaries, untrusted output validation, source attribution and confirmation before writes.
7. Run the affected production build and examine warnings rather than suppressing them blindly.

Use existing project commands and tests. Do not add snapshots or wording-only tests that fail to establish behavior.

## Report honestly

List each command or manual scenario with PASS, FAIL or SKIPPED and a reason. Separate confirmed defects from risks and suggestions. A blocker should include the exact missing dependency or decision. Do not modify unrelated code during a read-only review unless the user also asked for fixes.
