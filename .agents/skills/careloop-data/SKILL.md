---
name: careloop-data
description: Design, migrate, secure, seed, or review CareLoop Supabase/Postgres data, including tables, functions, indexes, row-level security, storage, and realtime authorization. Use for supabase or persistence-contract work; do not use for API-only mapping that does not change data behavior.
metadata:
  author: Adithya A
  short-description: Evolve CareLoop data safely
---

# CareLoop data

Author: Adithya A

Treat authorization and migration safety as part of the schema, not cleanup after implementation.

## Required context

Read root `AGENTS.md`, `supabase/AGENTS.md`, [`docs/database.md`](../../../docs/database.md), [`docs/API_CONTRACTS.md`](../../../docs/API_CONTRACTS.md), and all migrations that define the affected objects.

## Migration workflow

1. Describe the data invariant and affected roles before writing SQL.
2. Add a new sortable migration. Never edit an applied migration.
3. Define types, nullability, defaults, checks, foreign-key deletion behavior and timestamps deliberately.
4. Add indexes that match actual membership, status, time-order and lookup access paths.
5. Enable RLS before exposure and add policies for each required operation.
6. Consider functions, views, storage and realtime separately; table RLS does not secure every surface automatically.
7. Update synthetic seed data only when the demo requires the new contract.

## Authorization invariants

- Circle-owned data is visible or mutable only to authorized circle members with the necessary role.
- Identity comes from `auth.uid()` or a verified server context, never a caller-supplied profile ID.
- `security definer` functions use a fixed `search_path`, least privilege and explicit grants.
- Service-role access remains backend-only.
- Policies must be tested for allowed same-circle behavior and denied anonymous, non-member and cross-circle behavior.

## Verification

Review the complete resulting schema, not only the new SQL. When the CLI is available, reset an isolated local database and run policy tests. Never connect or apply changes to a remote or production project without explicit user authorization. Report untested migration assumptions precisely.
