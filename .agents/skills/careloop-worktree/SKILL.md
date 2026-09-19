---
name: careloop-worktree
description: Coordinate parallel CareLoop agent work across Git worktrees, ownership areas, branches, commits, handoffs, and integration without overwriting another task. Use when starting, splitting, resuming, handing off, or integrating concurrent work.
metadata:
  author: Adithya A
  short-description: Coordinate collision-free CareLoop work
---

# CareLoop worktree coordination

Author: Adithya A

Use one task, one worktree and one explicit ownership boundary. A worktree isolates files and indexes but still shares repository history with other worktrees.

## Required context

Read root `AGENTS.md`, [`docs/WORKTREES.md`](../../../docs/WORKTREES.md), and [`docs/AGENT_HANDOFF.md`](../../../docs/AGENT_HANDOFF.md). Inspect current branch, `HEAD`, status and relevant active handoffs before editing.

## Start safely

1. Identify the base commit, owned paths and acceptance criteria.
2. Check for path or contract overlap with active work.
3. Use an isolated worktree. A Codex-managed detached `HEAD` is normal.
4. Read agent guidance again from inside the worktree because nested scope matters.
5. Install dependencies within the worktree and allocate non-conflicting ports.

Do not edit another worktree, share a mutable dependency directory, check out one branch in multiple worktrees, or manipulate another task's stash, index, processes or untracked files.

## During work

- Stay inside owned paths unless a cross-boundary contract change is necessary and communicated.
- Make shared contracts first, then implementations and consumers.
- If unexpected changes overlap, stop on those files and escalate the dependency. Never discard unknown changes.
- Keep secrets ignored and generated output untracked.

## Preserve and hand off

Run relevant checks, inspect the full diff, and preserve detached work on a `codex/<short-scope>` branch when appropriate. Use the handoff contract to record outcome, contracts, verification, safety impact, remaining work and integration order.

Push or merge only the owned branch and only within the user's authorization. Do not delete a worktree until its commits are preserved and no active task depends on local state.
