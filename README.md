# CareLoop

Author: Adithya A

CareLoop is a playful, family-first care coordination prototype: shared tasks, voice updates, handoffs, timelines, memories and gentle wellbeing check-ins in one calm place.

> CareLoop coordinates and summarizes. It does not diagnose, prescribe, or alter medication.

## What is included

- `apps/web` — Vite, React and TypeScript; all planned onboarding and product screens
- `apps/api` — FastAPI routes, schemas, services, bounded agents and voice tools
- `packages/design-system` — the warm CareLoop palette and reusable primitives
- `packages/shared` — stable types and safety copy
- `supabase` — schema, indexes, RLS policies and synthetic demo data
- `docs` — architecture, database, voice, demo and safety notes

## Start locally

Requirements: Node 20+, pnpm 9+, Python 3.11+ and optionally the Supabase CLI.

```bash
cp .env.example .env
pnpm install
python -m venv apps/api/.venv
# Windows: apps/api/.venv/Scripts/pip install -e "apps/api[dev]"
# macOS/Linux: apps/api/.venv/bin/pip install -e "apps/api[dev]"
pnpm dev
```

Web: `http://localhost:5174` · API docs: `http://localhost:8000/docs`

Configure Supabase with the project URL in both `VITE_SUPABASE_URL` and
`SUPABASE_URL`. Use the browser-safe publishable key in
`VITE_SUPABASE_PUBLISHABLE_KEY`, and keep `SUPABASE_SECRET_KEY` and
`OPENAI_API_KEY` backend-only. Never add a secret key to a `VITE_` variable.

For deterministic demo data, configure the existing demo Supabase project in
the root `.env` with backend-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, then
run:

```bash
python scripts/reset_demo.py
# or: pnpm demo:reset
```

The reset command verifies the four fixed synthetic profiles, deletes child
records only from Amma's fixed demo Care Circle, and restores the exact opening
state. It intentionally removes live/test records created inside that demo
circle. It never deletes profiles, auth users, the circle, or data from another
circle. `python scripts/seed_demo.py` performs deterministic upserts without
cleanup when existing demo interactions should be preserved.

For a fresh local stack, run `supabase start` and `supabase db reset` first so
the deterministic demo auth identities exist, then run the reset command above.

Keep `DEMO_MODE=true` and `VITE_DEMO_MODE=true` for the in-memory/fixed-transcript
fallback. Set both to `false` after adding the Supabase and OpenAI values to use
authenticated Supabase persistence, filtered Realtime updates, GPT Live voice,
and GPT-5.6 Luna extraction. The seeded demo profiles use synthetic local/demo
credentials only; do not reuse them for real users.

## Development

```bash
pnpm typecheck
pnpm build
pnpm test
```

Read [AGENTS.md](./AGENTS.md) before parallel work. Keep changes within one ownership boundary where possible and use separate worktrees for independent streams.

## Agent development

Repository-local skills live in [`.agents/skills`](./.agents/skills) and are automatically discoverable when Codex works inside this repository. Start with:

- [AGENTS.md](./AGENTS.md) for global ownership, safety and verification rules
- [DESIGN.md](./DESIGN.md) for the canonical product and interface system
- [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution expectations
- [Worktree protocol](./docs/WORKTREES.md) for isolated parallel work
- [Agent handoff](./docs/AGENT_HANDOFF.md) for task continuation and integration
- [Testing strategy](./docs/TESTING.md) and [API contracts](./docs/API_CONTRACTS.md) for evidence and boundaries

All CareLoop product direction, repository-specific agent guidance and skills are authored under Adithya A.
