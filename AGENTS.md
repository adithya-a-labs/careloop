# CareLoop agent operating guide

Author: Adithya A
Repository: `adithya-a-labs/careloop`

CareLoop is a warm, family-first care coordination product. Every agent must preserve the product boundary:

> CareLoop coordinates and summarizes. It does not diagnose, prescribe, or alter medication.

## Read before editing

1. Read this file completely.
2. Read the closest nested `AGENTS.md` for the files you will touch.
3. Read [DESIGN.md](./DESIGN.md) for any user-facing change.
4. Read [docs/safety-boundaries.md](./docs/safety-boundaries.md) for voice, wellbeing, summaries, AI, or health-adjacent work.
5. Read [docs/WORKTREES.md](./docs/WORKTREES.md) before parallel or worktree-based work.

More specific `AGENTS.md` files override this root guide within their directory, but they cannot weaken safety, security, accessibility, authorship, or verification requirements.

## Repository-local skills

Codex discovers the following skills from `.agents/skills`. Use the narrowest matching skill and follow it completely:

| Skill | Use for |
| --- | --- |
| `careloop-product` | Product behavior, feature scope, user journeys, safety and acceptance criteria |
| `careloop-web-ui` | React screens, interaction design, responsive behavior and accessibility |
| `careloop-api` | FastAPI routes, schemas, orchestration, voice and bounded agent tools |
| `careloop-data` | Supabase migrations, RLS, seed data and persistence contracts |
| `careloop-quality` | Verification, review, regression checks and release readiness |
| `careloop-worktree` | Parallel work, ownership, commits, handoffs and integration |

## Ownership boundaries

| Area | Responsibilities | Local guidance |
| --- | --- | --- |
| `apps/web` | Routes, screens, accessibility, frontend state and API clients | `apps/web/AGENTS.md` |
| `apps/api` | HTTP contracts, orchestration, safety checks and provider adapters | `apps/api/AGENTS.md` |
| `packages/design-system` | Tokens and reusable visual primitives | `packages/design-system/AGENTS.md` |
| `packages/shared` | Stable cross-app types and constants | `packages/shared/AGENTS.md` |
| `supabase` | Additive migrations, RLS, indexes and demo seed | `supabase/AGENTS.md` |
| `docs` | Architecture, decisions, demos, safety and contracts | this file |

An agent owns only the area named in its task. Cross-boundary work must be explicit. When a change spans areas, update in this order: shared contract, persistence/API implementation, web consumer, documentation, verification.

## Collision-free work

- Use one task, one worktree and one branch. Branch names use `codex/<short-scope>` unless the user specifies another name.
- Do not edit, stash, reset, clean, rebase, delete or move another agent's work.
- Do not share a branch between active worktrees. Codex-managed worktrees may begin on detached `HEAD`; create a branch only when the work is ready to preserve.
- Keep generated artifacts out of Git: `node_modules`, `dist`, caches, virtual environments and local secrets.
- Do not rewrite applied migrations. Add a new migration with a sortable timestamp.
- If unexpected changes overlap your files, stop and report the collision instead of overwriting them.
- Record contract changes and unresolved dependencies in the handoff described in [docs/AGENT_HANDOFF.md](./docs/AGENT_HANDOFF.md).

## Non-negotiable engineering rules

- Keep privileged Supabase and LLM credentials in `apps/api`; the browser may receive only public configuration and the Supabase anonymous key.
- LLMs and agents may call named, validated backend tools only. Never expose arbitrary SQL, arbitrary code execution, diagnosis, prescribing or medication mutation.
- Mutating voice or generated actions must be previewed and explicitly confirmed.
- Enforce care-circle membership on every circle-owned data operation, including realtime and storage access.
- Demo data must be synthetic. Never commit secrets, personal health information or real patient data.
- Use the canonical design tokens; do not introduce violet or purple hues.
- Preserve keyboard access, visible focus, semantic labels, readable contrast and comfortable touch targets.

## Verification matrix

Run the smallest relevant checks during development and the full affected set before handoff.

| Change | Required checks |
| --- | --- |
| Web, shared types or design system | `pnpm typecheck` and `pnpm build` |
| API Python | `python -m compileall -q apps/api/app` and relevant `pytest` tests when dependencies are installed |
| Supabase | Review migration ordering, RLS coverage, indexes and `supabase db reset` when the CLI is available |
| Docs or skills only | Skill validation, link/path review and `git diff --check` |
| Cross-cutting | All applicable checks above |

Never claim a check passed unless you ran it. State skipped checks and the reason.

## Handoff definition of done

- The requested behavior is implemented without unrelated refactors.
- Safety, access-control and design invariants still hold.
- Relevant checks pass, or blockers are recorded precisely.
- User-facing or architectural changes update the canonical documentation.
- The worktree contains no unintended generated files or secrets.
- The handoff names changed areas, validation evidence, migrations, risks and the next owner.

All repository-specific agent guidance and skills are authored and maintained under the direction of Adithya A.
