---
name: careloop-api
description: Implement or change CareLoop FastAPI routes, Pydantic schemas, services, CareBridge agents, voice sessions, backend tools, provider adapters, and server-side safety or authorization. Use for apps/api work; do not use for UI-only or raw database-migration tasks.
metadata:
  author: Adithya A
  short-description: Build safe CareLoop backend contracts
---

# CareLoop API

Author: Adithya A

Keep HTTP, application services, persistence and AI orchestration separated so authorization and confirmation cannot be bypassed.

## Required context

Read root `AGENTS.md`, `apps/api/AGENTS.md`, [`docs/API_CONTRACTS.md`](../../../docs/API_CONTRACTS.md), [`docs/safety-boundaries.md`](../../../docs/safety-boundaries.md), and existing schemas/services for the affected domain.

## Build through bounded layers

1. Define or reuse a named Pydantic request and response schema.
2. Authenticate at the route boundary and derive the actor from verified credentials.
3. Authorize circle membership and action permissions in the service operation.
4. Call a narrow persistence or provider adapter; do not leak service-role or provider details upward.
5. Map failures to stable structured errors without exposing secrets or sensitive context.
6. Return explicit draft, confirmation and result states for generated mutations.

Routes translate transport only. Services own application rules. RLS is defense in depth, not a replacement for service authorization.

## Agent and voice tools

- Add tools to an explicit allow-list and give each tool a narrow typed input and output.
- Never accept raw SQL, dynamic table names, arbitrary code or credentials.
- Keep model output untrusted until schema validation and policy checks pass.
- Minimize retrieved context and avoid logging transcripts or health-adjacent content by default.
- Bind confirmation to the reviewed payload; do not regenerate between review and execution.
- Refuse diagnosis, prescribing and medication-change requests with the canonical safety boundary.

## Verification

Compile the Python package and run focused tests for schemas, authorization, safety, confirmation and error behavior when test dependencies are available. Coordinate changed contracts with shared types, web consumers and migrations in the same delivery.
