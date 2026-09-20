# Supabase agent guide

Author: Adithya A
Scope: `supabase/**`

Use the `careloop-data` skill for schema, RLS, seed, storage or realtime work. Read `docs/database.md` and `docs/API_CONTRACTS.md` before changing persistence contracts.

## Migration rules

- Add a new timestamped migration; never rewrite an applied migration.
- Make constraints, foreign-key behavior, indexes and defaults explicit.
- Plan for rollback or safe forward repair even when migrations are forward-only.
- Seed only synthetic deterministic demo data.

## Authorization rules

- Enable RLS before exposing a table.
- Add allow and deny tests for members, non-members and cross-circle access.
- Treat views, functions, storage and realtime as authorization surfaces too.
- Use `security definer` only with a fixed `search_path`, least privilege and a documented reason.
- Revoke broad function privileges and grant only the roles that need execution.
- Service-role use is backend-only and never compensates for missing user-facing policies.

When available, run `supabase db reset` and database/RLS tests in an isolated local stack. Do not target a remote or production project without explicit authorization.
