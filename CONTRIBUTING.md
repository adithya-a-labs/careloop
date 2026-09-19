# Contributing to CareLoop

Author: Adithya A

## Before starting

- Read `AGENTS.md`, the nearest nested agent guide and the relevant repository-local skill.
- Confirm a single ownership area and a short acceptance criterion for the task.
- For parallel work, create or use an isolated worktree as described in `docs/WORKTREES.md`.

## Branches and commits

- Use `codex/<short-scope>` for agent-created branches unless a maintainer requests another name.
- Keep commits reviewable and scoped by purpose: contracts, implementation, tests or documentation.
- Do not commit secrets, `.env` files, build output, virtual environments or real care-recipient data.
- Preserve the user's requested commit attribution. Repository-authored guidance and design documents should credit Adithya A.

## Pull requests and handoffs

- Explain the user outcome, not just the files changed.
- List validation commands and their results.
- Call out database migrations, environment changes, safety implications and deferred work.
- Use `docs/AGENT_HANDOFF.md` when another agent will continue the work.

## Definition of done

A contribution is complete when the requested behavior works, applicable checks pass, documentation matches behavior, safety and access-control boundaries hold, and the diff contains no unrelated or generated changes.
