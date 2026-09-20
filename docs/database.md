# Database

Author: Adithya A

The first migration defines profiles, care circles and membership, care events, tasks, scheduled items, handoffs, memories and availability. Every circle-owned table has row-level security based on active membership. Profiles are visible to the user or people who share a circle.

Later additive migrations define the current integration contract, explicit Data
API grants, Realtime publication membership for care events, tasks and memories,
and a separate MemoryBox authorization helper. MemoryBox access is limited to the
care recipient and family roles; professional caregivers are denied even when
they are active members of the same circle.

There are no CareLoop Storage buckets or custom database triggers. The repository
migrations contain the complete required schema; no Dashboard-only objects are
part of the application contract. See `docs/SUPABASE_SETUP.md` for the audited
inventory and provisioning workflow.

Apply locally with `supabase start` and `supabase db reset`. `seed.sql` contains synthetic demo users only. Production invitation flows should use a short-lived, hashed invitation token rather than exposing `invite_code` directly.
