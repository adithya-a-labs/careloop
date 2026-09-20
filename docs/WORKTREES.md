# Worktree and parallel-agent protocol

Author: Adithya A

This protocol lets multiple CareLoop tasks progress without agents overwriting one another or coupling unrelated changes.

## Core model

One active task owns one worktree, one narrowly defined scope and one branch or detached-HEAD change set. Worktrees share Git history but have independent files, indexes, dependencies and build output.

## Starting work

1. Sync the intended base branch before creating the worktree.
2. Write the task boundary as owned paths plus acceptance criteria.
3. Check active tasks or handoffs for overlapping paths.
4. Create the worktree from the intended base. Codex-managed worktrees can begin on detached `HEAD`; this is expected.
5. Read root and nested `AGENTS.md` files from inside that worktree.
6. Install dependencies locally in that worktree. Never point two worktrees at one mutable `node_modules`, `.venv` or build directory.

## Ownership rules

- The task owner may edit only its declared area plus necessary contracts and documentation.
- A shared contract change must be communicated before dependent agents implement against it.
- Another agent's branch, index, stash, untracked files and running process are off limits.
- Never use cleanup, reset or checkout operations against a path you did not create.
- If two tasks need the same file, sequence the work or split the file along an agreed interface. Do not race edits.

## Local configuration

`.worktreeinclude` lists ignored configuration that Codex-managed local worktrees may copy from the primary checkout. It includes local environment files only. Tracked files are already present and must not be listed.

Treat copied `.env` files as secrets: keep them ignored, do not print them, and never add them to Git. `AGENTS.override.md` is copied automatically by Codex and is intentionally absent from `.worktreeinclude`.

## Branches and integration

- Use `codex/<short-scope>` unless the maintainer specifies a branch.
- A Git branch can be checked out in only one worktree at a time.
- Preserve work from a detached worktree by creating a branch before handoff or push.
- Prefer a focused pull request or a reviewed handoff over merging multiple worktrees locally.
- The integrator resolves cross-task conflicts; individual agents should not rewrite one another's history.

## Ports and processes

Parallel apps must use distinct ports. Record any override in the handoff rather than changing committed defaults solely for a worktree. Stop only processes started by your task; verify the process and working directory before termination.

Suggested local allocation:

| Worktree | Web | API | Supabase API |
| --- | ---: | ---: | ---: |
| Primary | 5173 | 8000 | 54321 |
| Secondary 1 | 5174 | 8001 | dedicated stack or none |
| Secondary 2 | 5175 | 8002 | dedicated stack or none |

Do not run two local Supabase stacks against the same ports or state directory.

## Finishing work

1. Run the checks required by `AGENTS.md` and the affected local guides.
2. Inspect `git status` and the complete diff for unrelated or generated files.
3. Commit or preserve the work on its own branch.
4. Complete the handoff in `docs/AGENT_HANDOFF.md`.
5. Push only the owned branch unless the maintainer explicitly requests direct integration.
6. Remove a worktree only after its branch or commit is safely preserved and no task depends on its local state.

## Collision response

When unexpected edits overlap the task:

1. Stop modifying the overlapping files.
2. Capture the paths and relevant contract disagreement.
3. Notify the maintainer or integrator with the exact dependency.
4. Continue only on independent files, or wait for an explicit integration decision.

Never solve a collision by discarding unknown changes.
