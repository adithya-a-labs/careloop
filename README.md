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

## Agent development

Repository-local skills live in [`.agents/skills`](./.agents/skills) and are automatically discoverable when Codex works inside this repository. Start with:

- [AGENTS.md](./AGENTS.md) for global ownership, safety and verification rules
- [DESIGN.md](./DESIGN.md) for the canonical product and interface system
- [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution expectations
- [Worktree protocol](./docs/WORKTREES.md) for isolated parallel work
- [Agent handoff](./docs/AGENT_HANDOFF.md) for task continuation and integration
- [Testing strategy](./docs/TESTING.md) and [API contracts](./docs/API_CONTRACTS.md) for evidence and boundaries

All CareLoop product direction, repository-specific agent guidance and skills are authored under Adithya A.
