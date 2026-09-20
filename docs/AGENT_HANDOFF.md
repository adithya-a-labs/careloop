# Agent handoff contract

Author: Adithya A

Use this compact structure when another agent or maintainer will continue, review or integrate a CareLoop task. Replace prompts with concrete facts and omit empty optional sections.

```markdown
## Outcome

What user-visible or engineering outcome is complete?

## Scope

- Worktree or branch:
- Base commit:
- Owned areas:
- Changed files or modules:

## Contracts changed

- API routes or schemas:
- Shared types:
- Database migrations or RLS:
- Environment variables:
- Design-system behavior:

## Safety and privacy

- Safety boundary reviewed:
- Authorization/RLS impact:
- Sensitive data handling:
- Human confirmation behavior:

## Verification

- Command — PASS/FAIL/SKIPPED and reason

## Remaining work

- Exact unfinished item, dependency or decision owner

## Integration notes

- Expected conflicts:
- Required order:
- Suggested next owner:
```

A handoff is evidence, not a substitute for a clean diff. Do not claim passing checks without command results, and do not describe credentials or personal data in the handoff.
