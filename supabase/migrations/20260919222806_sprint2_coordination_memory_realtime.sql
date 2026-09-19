-- Sprint 2 keeps the existing schema and RLS contracts intact. This migration
-- only enables optional MemoryBox Realtime and refreshes exact synthetic demo
-- rows so the coordination scenario remains deterministic whenever it runs.

alter table public.memories replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'memories'
  ) then
    alter publication supabase_realtime add table public.memories;
  end if;
end
$$;

update public.tasks
set
  assigned_to = null,
  status = 'pending',
  due_at = (
    (now() at time zone 'Asia/Kolkata')::date + interval '1 day 15 hours'
  ) at time zone 'Asia/Kolkata',
  completed_at = null,
  updated_at = now()
where id = '40000000-0000-0000-0000-000000000001'
  and circle_id = '20000000-0000-0000-0000-000000000001';

update public.availability
set
  starts_at = (
    (now() at time zone 'Asia/Kolkata')::date + interval '1 day 13 hours'
  ) at time zone 'Asia/Kolkata',
  ends_at = (
    (now() at time zone 'Asia/Kolkata')::date + interval '1 day 17 hours'
  ) at time zone 'Asia/Kolkata',
  note = 'Available tomorrow afternoon'
where id = '70000000-0000-0000-0000-000000000001'
  and circle_id = '20000000-0000-0000-0000-000000000001';

update public.scheduled_items
set
  starts_at = (
    (now() at time zone 'Asia/Kolkata')::date + interval '1 day 19 hours'
  ) at time zone 'Asia/Kolkata',
  ends_at = (
    (now() at time zone 'Asia/Kolkata')::date + interval '1 day 19 hours 30 minutes'
  ) at time zone 'Asia/Kolkata'
where id = '50000000-0000-0000-0000-000000000001'
  and circle_id = '20000000-0000-0000-0000-000000000001';
