# Architecture decision log

Author: Adithya A

Record decisions that constrain future CareLoop work. Keep entries short; link a longer document when needed. Do not use this log for task status.

## ADR-001 — Small product-oriented monorepo

- Status: accepted
- Decision: Keep `apps/web`, `apps/api`, shared packages, Supabase and documentation in one pnpm workspace.
- Reason: Product contracts remain visible while work can be divided cleanly by ownership area and worktree.

## ADR-002 — Backend-controlled AI tools

- Status: accepted
- Decision: LLM and voice orchestration stays behind FastAPI and receives only named, validated tools. No arbitrary SQL or client-side provider keys.
- Reason: This keeps authorization, auditability, clinical boundaries and user confirmation under application control.

## ADR-003 — Supabase row-level security is mandatory

- Status: accepted
- Decision: Every circle-owned table, storage policy and realtime path must enforce care-circle membership. Service-role access is server-only.
- Reason: Application filters are not an authorization boundary.

## ADR-004 — Confirmation before generated mutations

- Status: accepted
- Decision: Voice and generated outputs may draft or preview mutations, but a person confirms before persistence or sharing.
- Reason: Transcription and generation are fallible, and care coordination needs clear accountability.

## ADR-005 — Canonical warm design system

- Status: accepted
- Decision: Use the palette and interaction rules in root `DESIGN.md`; no violet or purple hues.
- Reason: A consistent, reassuring and family-first identity is central to the product rather than decorative polish.

## New decision template

```markdown
## ADR-NNN — Short title

- Status: proposed | accepted | superseded
- Decision:
- Reason:
- Consequences:
- Supersedes:
```
