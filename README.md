# CareLoop

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

Web: `http://localhost:5173` · API docs: `http://localhost:8000/docs`

For local data:

```bash
supabase start
pnpm demo:reset
```

The frontend works as a polished static demo before credentials are added. Route and service stubs mark integration seams without pretending external services are configured.

## Development

```bash
pnpm typecheck
pnpm build
pnpm test
```

Read [AGENTS.md](./AGENTS.md) before parallel work. Keep changes within one ownership boundary where possible and use separate worktrees for independent streams.
