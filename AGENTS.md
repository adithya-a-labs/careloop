# CareLoop agent guide

CareLoop is a family-first coordination product. Keep changes small, reviewable, and inside the owning area below. Shared contracts should be changed before their consumers.

## Ownership

| Area | Owner boundary |
| --- | --- |
| `apps/web` | Routes, screens, accessibility, frontend state, API clients |
| `apps/api` | HTTP contracts, orchestration, safety checks, provider adapters |
| `packages/design-system` | Tokens and reusable visual primitives; no product data access |
| `packages/shared` | Stable cross-app types and constants; no runtime integrations |
| `supabase` | Additive migrations, RLS, indexes, demo seed |
| `docs` | Architecture, demos, safety and integration decisions |

## Working agreements

- One feature or ownership area per branch/worktree. Use `codex/<short-topic>` branches.
- Never edit another worktree's uncommitted files or rewrite shared history.
- Keep LLM and privileged Supabase access in `apps/api`; the browser receives only the anon key.
- Agents may call named backend tools only. Never expose arbitrary SQL, medication mutation, diagnosis, or prescribing.
- Add migrations; do not rewrite an applied migration. Demo data must be synthetic.
- Before handoff run `pnpm typecheck`, `pnpm build`, and API tests relevant to the change.
- CareLoop coordinates and summarizes. It does not diagnose, prescribe, or alter medication.
