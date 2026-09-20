# CareLoop — Bring Your Own Supabase

CareLoop does not depend on the original developer's Supabase project. The
database schema, grants, row-level security (RLS), Realtime publication, and
synthetic demo state are version controlled in this repository.

The source-of-truth order is:

1. `supabase/migrations/` — schema and access control
2. `supabase/seed.sql` — synthetic demo identities and records
3. `scripts/setup-supabase.ts` — safe automation around the Supabase CLI
4. `scripts/verify-supabase.ts` — runtime proof that the result is usable

Do not recreate or rename tables in the Dashboard. Add future schema changes as
new timestamped migrations.

## What CareLoop provisions

The migrations define these public tables:

| Table             | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `profiles`        | Auth-linked people, language and preferences  |
| `care_circles`    | Family care spaces                            |
| `circle_members`  | Role, relationship and active membership      |
| `care_events`     | Attributed meals, sleep, visits and check-ins |
| `tasks`           | Assignment, due time, priority and completion |
| `scheduled_items` | Upcoming calls, visits and follow-ups         |
| `handoffs`        | Attributed summaries and open items           |
| `memories`        | Private family MemoryBox records              |
| `availability`    | Declared member availability windows          |

They also define the `circle_role`, `task_status`, and `handoff_status` enums;
membership foreign keys and time/status indexes; the bounded
`is_circle_member` and `can_access_memories` functions; RLS policies; explicit
Data API grants; and Realtime publication membership for `care_events`, `tasks`,
and `memories`.

CareLoop currently uses no Storage bucket and no custom database trigger. No
untracked Dashboard-created schema is required.

MemoryBox is readable and writable only by the care recipient and family
members. The professional caregiver role cannot retrieve it through RLS or the
FastAPI service.

## Prerequisites

- Node.js 20 or newer and pnpm 9
- A new or disposable Supabase project that you own
- The project URL and browser-safe publishable (or legacy anon) key
- The backend-only secret/service-role key
- The project reference, database password, and a Supabase personal access token

Install repository dependencies first:

```bash
pnpm install
```

The repository pins the Supabase CLI, so a global CLI install is not required.

## Find your Supabase values

In the Supabase Dashboard for your project:

- Project URL and API keys: **Project Settings → API**
- Database password: the value chosen when the project was created; reset it in
  **Project Settings → Database** if necessary
- Project reference: the `<project-ref>` in
  `https://supabase.com/dashboard/project/<project-ref>`
- Personal access token: create one under your Supabase account access-token
  settings

The service-role/secret key bypasses RLS. It belongs only in the root `.env` and
server-side tools. Never put it in a `VITE_` variable, browser bundle, log, issue,
or commit.

## Configure the environment

```bash
cp .env.example .env
```

Fill at least these values for a hosted project:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<browser-safe publishable key>
SUPABASE_SECRET_KEY=<backend-only secret key>
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_DB_PASSWORD=<database password>
SUPABASE_ACCESS_TOKEN=<personal access token>

VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<browser-safe publishable key>
```

Legacy projects may use `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
`VITE_SUPABASE_ANON_KEY` instead. The scripts and web client accept those aliases.
Do not fill both forms with different keys.

`.env` and Supabase CLI temporary state are ignored by Git.

## Automatic setup

Run this only against a fresh development, judging, or staging project. The
command applies migrations and inserts synthetic demo users and data; it does
not reset or delete unrelated remote rows.

```bash
pnpm setup:supabase
```

The setup command:

1. validates the environment and ensures the URL matches the project reference;
2. verifies the service key can reach the target project;
3. refuses to overwrite same-email demo users with unexpected IDs;
4. links the pinned Supabase CLI to the target;
5. runs `supabase db push --linked --include-seed`;
6. runs the complete verification suite.

The seed creates login-capable synthetic users for Amma, Maya, Rahul, and Anu
with password `careloop-demo`. Their fixed synthetic IDs are an existing
CareLoop demo contract used by the role switcher and API fixtures. They are
created from `supabase/seed.sql`; no original-project users or credentials are
required.

For a local Supabase stack, start Docker and the stack first, copy the values
shown by `pnpm exec supabase status` into `.env`, and then run the same setup
command. Local setup uses `supabase db reset --local`, which intentionally resets
only the local stack.

## Verify the project

```bash
pnpm verify:supabase
```

Verification exits non-zero unless it proves:

- connectivity and all nine required tables;
- RLS on every public table and the MemoryBox policies;
- Realtime publication membership for care events, tasks and memories;
- Amma, Maya, Rahul and Anu profiles;
- care history, upcoming Anu visit, Rahul availability and MemoryBox records;
- the pending, unassigned prescription task falls inside Rahul's availability;
- an authenticated shared-task read/write path works; and
- Anu can read shared tasks but cannot retrieve private MemoryBox records.

Expected final output includes:

```text
✓ Supabase connected
✓ Schema initialized
✓ RLS configured
✓ Realtime configured
✓ Demo profiles available
✓ Demo data seeded
✓ Hero prescription task ready
✓ CareLoop ready
```

## Start CareLoop

Install the Python API dependencies as described in the main README, then run:

```bash
pnpm dev
```

The shortest hosted-project path is:

```bash
cp .env.example .env
# Fill in your own Supabase credentials.
pnpm setup:supabase
pnpm verify:supabase
pnpm dev
```

## Troubleshooting

- **Missing environment value:** compare `.env` with `.env.example`. Blank
  placeholders do not count as configured values.
- **Project reference mismatch:** use the reference from the same Dashboard URL
  as `SUPABASE_URL`.
- **CLI authentication failure:** create a fresh `SUPABASE_ACCESS_TOKEN` and
  confirm `SUPABASE_DB_PASSWORD` is the project's database password.
- **Existing demo email with another ID:** use a fresh project or remove only
  that synthetic account. The setup script stops instead of overwriting it.
- **Realtime is silent:** run `pnpm verify:supabase`; publication membership and
  RLS are both required for Postgres Changes.
- **Anu sees zero memories:** this is expected. MemoryBox is private family data.
- **Local reset fails:** ensure Docker is running and start the local stack with
  `pnpm exec supabase start` before setup.

## Using a Supabase Agent / Connector

An AI coding agent with a Supabase connector should:

1. read this file;
2. read `.env.example` without requesting secret values in chat;
3. inspect every file in `supabase/migrations/`;
4. connect only to the user's own Supabase project;
5. apply the repository migrations in order;
6. configure and verify RLS, grants, functions and Realtime;
7. run the version-controlled CareLoop demo seed; and
8. run `pnpm verify:supabase`.

Do not invent schema. Do not rename tables. Repository migrations are
authoritative. Never request or rely on the original developer's Supabase
credentials, and never expose a secret/service-role key to the frontend.
