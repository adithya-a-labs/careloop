# Verification strategy

Author: Adithya A

CareLoop verification follows risk. Tests should establish user behavior, contracts, authorization and safety rather than mirror implementation details.

## Required layers

| Layer | Focus |
| --- | --- |
| Static | TypeScript type safety, Python compilation/linting, formatting and broken imports |
| Unit | Pure coordination rules, schema validation, safety guardrails and UI state transitions |
| Contract | Web/API payload compatibility and stable error shapes |
| Database | Migration application, constraints, indexes and RLS allow/deny cases |
| Integration | Authenticated care-circle flows, confirmation before writes and provider failure handling |
| UI | Keyboard access, responsive layouts, form recovery and critical role journeys |

## High-value scenarios

- A non-member cannot read or mutate circle-owned records.
- A care recipient and a family member see the correct role-specific home experience.
- An unassigned task remains visible and can be claimed without silent reassignment.
- A voice transcript produces a reviewable draft and performs no write before confirmation.
- A diagnosis or medication-change request is rejected with the standard safety boundary.
- A handoff preserves source timestamps, attribution and outstanding actions.
- Wellbeing remains a subjective check-in and is never labeled a clinical assessment.
- The interface remains operable by keyboard and at mobile width.

## Reporting results

Report the exact command and PASS, FAIL or SKIPPED. A skipped integration check must state the missing dependency, such as Supabase CLI or provider credentials. Never weaken assertions to make a check pass.
