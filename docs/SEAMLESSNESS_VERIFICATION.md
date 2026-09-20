# CareLoop seamlessness pass

Author: Adithya A (product direction and final engineering ownership)

## Outcome and scope

Implemented on `main`, based on `83e5eec`. Existing design, model IDs, WebRTC transport,
FastAPI writes, real Supabase authentication, schema and RLS are preserved.

## Root causes and changes

- Coordination selected the first matching/pending task and could fall back from “my”
  tasks to someone else's work. References now require an unambiguous pending task;
  multiple people or task titles trigger clarification. Completing a visit cannot
  select a remaining unrelated medicine-check task.
- Cached profile tokens did not restore the persisted Supabase session. Explicit
  profile activation now restores it, while cached API token reads do not change
  Realtime identity. Role-sensitive routes remount on identity change.
- Realtime changes left shared reads stale. Cache invalidation retains visible
  values, reconciles known records by ID, and rejects stale in-flight cache writes.
  Care events and memories now handle updates/deletes as well as inserts.
- Late voice results could outlive a reset. Interaction revisions ignore them,
  prior results stay visible during processing, and late live connections close.
- Partial multi-event failures could duplicate successful writes on retry. Only
  failed events remain in the retry preview. Extracted details are visible before
  confirmation; assignment success uses the actual assignee.
- Memory openers now invite the story instead of saving the opening sentence.
- Multi-source context answers now use the existing `gpt-5.6-luna` structured
  synthesis path. Source records stay application-owned. Tasks, schedule and meal
  reads remain deterministic. Provider timeouts are bounded and return retryable
  voice-turn errors.

## Voice/retrieval and coordination evidence

- All 18 rendered prompt chips across Amma, Maya, Rahul and Anu returned HTTP 200
  with a supported capability. Ambiguous completion requests returned clarification.
  Memory opener and completed-visit corrections were additionally covered by tests.
- Typed Amma sleep/lunch request extracted `sleep` and `meal`, required review,
  saved two real synthetic events through FastAPI, and appeared in Timeline.
- Maya's prescription question derived Rahul from the real task/availability.
  “Ask Rahul” → confirmation → successful PATCH → an already-open, independent
  Rahul browser context updated its Tasks row without refresh.
- The prescription was already assigned at inspection. It was restored to the
  requested final opening state: pending, unassigned, due 2026-09-21 15:00 IST.
  Rahul's existing 13:00–17:00 IST availability was preserved. No seed reset ran.
- Only the two ordinary synthetic care events were added. No TEST/SMOKE records,
  new profiles, memories or tasks were added.

## Role UI, performance and layout

- Real Amma → Maya → cached Amma JWT/session switching and reload persistence passed.
- Verified Home, Timeline, Tasks, Circle and authorized MemoryBox routes for all
  roles, at 360×780, 390×844, 768×1024 and 1440×900 (76 route/viewport combinations).
  Hydrated screens had no alerts or horizontal overflow. Voice remains prominent.
- Anu has no Memories navigation; direct `/memories` redirects to her home.
  A real Anu MemoryBox API read returned the expected 403.
- No 401s or unexpected HTTP failures were captured during the route matrix.
  Rapid route teardown produced two WebSocket-close warnings; the independent
  browser Realtime assignment check passed. The intentional denied read produced
  an expected browser resource error. Development hot-reload artifacts were
  excluded by repeating checks after reload.
- Independent reads remain parallel; voice read/preview POSTs no longer discard
  shared read caches. Family and Tasks hydration ignore cancelled effects;
  caregiver Home now refreshes on task and care-event changes.
- Existing Tasks fixed-column geometry already aligned status, icon, content,
  metadata and actions. Preserved it without a CSS rewrite; inspected settled
  desktop/mobile screenshots including completed and unassigned rows.

## Automated checks

| Check | Result |
| --- | --- |
| Python `compileall -q apps/api/app` | PASS |
| API `pytest -q` | PASS: 70 tests |
| Changed-file Ruff | PASS |
| `pnpm --filter @careloop/web typecheck` | PASS |
| `pnpm --filter @careloop/web test` | PASS: 13 tests |
| `pnpm --filter @careloop/web build` | PASS |
| `git diff --check` | PASS |

Pytest/Ruff were supplied through `uv run --with` because the local venv lacked
them. No dependency manifest or lockfile change is required. Existing warnings:
Starlette/AnyIO deprecation; production JS bundle above Vite's 500 kB threshold.

## Screenshots

- [Tasks desktop](../output/playwright/tasks-desktop.png)
- [Tasks mobile](../output/playwright/tasks-mobile.png)
- [Amma](../output/playwright/home-Amma-1440.png)
- [Maya](../output/playwright/home-Maya-1440.png)
- [Rahul](../output/playwright/home-Rahul-1440.png)
- [Anu](../output/playwright/home-Anu-1440.png)
- [Rahul Realtime assignment](../output/playwright/rahul-realtime-assignment.png)

Mobile Home captures for all four profiles are alongside these files.

## Contracts and changed areas

- API: context/coordination agents, LLM adapter, voice-turn error mapping,
  memory-opening behavior and regression tests.
- Web: session activation, shared read cache, role-keyed shell, Voice, Timeline,
  Tasks, MemoryBox and all three role Home compositions, with cache/auth tests.
- Documentation: README model table, API contracts and this verification record.
- No schema migration, environment variable, shared schema, RLS or model change.

## Known limitations / next owner

- Live microphone → GPT-Live transcription was not exercised with human speech.
  Transport code is unchanged; the browser flows used the typed alternative.
  Adithya should perform a spoken rehearsal before the live demo.
- Task assignment Realtime was explicitly proven across browser contexts. The care
  event check proved extraction/persistence/Timeline rendering, but its initial
  hydration overlapped the read, so it does not independently prove event delivery
  exclusively through Realtime. Update/delete reconciliation has automated cache
  coverage; destructive live deletion was not performed.
- Server-side mutation idempotency is still a production follow-up: an ambiguous
  network failure after a successful insert can still need reconciliation.
- No ancestry rewrite or force-push is part of this pass. Commit author and
  committer metadata use the next unused reserved slot, 09:15:00 +05:30.
