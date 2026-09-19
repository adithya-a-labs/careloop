# API and tool contract rules

Author: Adithya A

This document defines stable rules for communication between CareLoop clients, FastAPI and bounded AI tools. Route-specific schemas remain in code.

## HTTP rules

- Version product endpoints under `/api/v1`.
- Validate request and response bodies with named schemas.
- Use stable machine-readable error codes alongside calm user-safe messages.
- Derive identity from verified authentication, never from a caller-supplied user ID.
- Scope circle-owned operations with both authenticated identity and membership authorization.
- Use UTC timestamps over the wire and preserve source timezone when relevant to display.
- Pagination, ordering and filters must be explicit for list endpoints.

## Mutation rules

- Retriable client mutations should accept an idempotency strategy before production use.
- Generated or voice-originated mutations begin as drafts and return `requires_confirmation: true`.
- A confirmation must bind to the reviewed payload; do not execute a regenerated payload silently.
- Record actor, source and timestamp for events, handoffs and meaningful state changes.

## Agent tool rules

- Tools are named, narrowly scoped application functions with validated inputs and structured outputs.
- Tools enforce authorization internally; model routing is not authorization.
- No tool accepts raw SQL, executable code, unrestricted table names or service-role credentials.
- Read tools return only the minimum context needed for the task.
- Write tools expose preview, confirmation and auditable result states.

## Compatibility

Change shared contracts before consumers. Prefer additive schema evolution. A breaking change requires updating affected web code, API tests, shared types and this document or the architecture decision log in the same coordinated delivery.
