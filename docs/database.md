# Database

Author: Adithya A

The first migration defines profiles, care circles and membership, care events, tasks, scheduled items, handoffs, memories and availability. Every circle-owned table has row-level security based on active membership. Profiles are visible to the user or people who share a circle.

Apply locally with `supabase start` and `supabase db reset`. `seed.sql` contains synthetic demo users only. Production invitation flows should use a short-lived, hashed invitation token rather than exposing `invite_code` directly.
