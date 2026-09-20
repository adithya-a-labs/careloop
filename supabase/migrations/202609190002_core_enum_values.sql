-- Enum values are committed in their own migration so the following migration
-- can safely use them as defaults on every supported Postgres version.
alter type public.circle_role add value if not exists 'patient';
alter type public.circle_role add value if not exists 'caregiver';

alter type public.task_status add value if not exists 'pending';
alter type public.task_status add value if not exists 'completed';
