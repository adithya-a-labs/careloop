# API application agent guide

Author: Adithya A
Scope: `apps/api/**`

Use the `careloop-api` skill for routes, schemas, services, agents, voice and provider integration. Read `docs/API_CONTRACTS.md` and `docs/safety-boundaries.md` for relevant work.

## Layer boundaries

- `api/routes`: transport, authentication dependencies and response mapping.
- `schemas`: validated external and internal contracts.
- `services`: authorization-aware application operations and persistence ports.
- `agents`: bounded planning and delegation only.
- `voice`: session state and allow-listed tools.
- `core`: configuration and cross-cutting safety policy.

Routes should remain thin. Model output never bypasses schemas, authorization, services or confirmation.

## Security and safety

- Derive actor identity from verified auth; never trust a body or query parameter for identity.
- Check circle membership at the service boundary even when RLS also applies.
- Service-role and provider credentials stay in server configuration and never enter responses or logs.
- Refuse diagnosis, prescribing and medication changes using the canonical safety language.
- Do not expose raw SQL, dynamic table access or arbitrary function execution as an agent tool.
- Store or log the minimum sensitive content necessary; use structured logs without transcripts by default.

## Contract changes

Coordinate changes with `packages/shared`, web consumers and database migrations. Prefer additive evolution and stable, typed error responses.

## Verification

Run `python -m compileall -q apps/api/app` from the repository root. When development dependencies are available, run focused `pytest` tests for changed routes, services, authorization and safety behavior.
