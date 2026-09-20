-- Make the existing CareLoop schema portable across projects whose Data API
-- default grants differ, and enforce the product's private MemoryBox boundary.

grant usage on schema public to authenticated;

revoke all on table
  public.profiles,
  public.care_circles,
  public.circle_members,
  public.care_events,
  public.tasks,
  public.scheduled_items,
  public.handoffs,
  public.memories,
  public.availability
from anon;

grant select, insert, update on table
  public.profiles,
  public.care_circles,
  public.circle_members,
  public.care_events,
  public.tasks,
  public.scheduled_items,
  public.handoffs,
  public.memories,
  public.availability
to authenticated;

create or replace function public.can_access_memories(target_circle uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.circle_members
    where circle_id = target_circle
      and profile_id = auth.uid()
      and is_active
      and role in ('care_recipient', 'patient', 'family')
  )
$$;

revoke all on function public.can_access_memories(uuid) from public;
revoke all on function public.can_access_memories(uuid) from anon;
grant execute on function public.can_access_memories(uuid) to authenticated;

drop policy if exists "memories members read" on public.memories;
drop policy if exists "memories members insert" on public.memories;
drop policy if exists "memories members update" on public.memories;

create policy "family and recipient read memories"
on public.memories for select
to authenticated
using (public.can_access_memories(circle_id));

create policy "family and recipient create memories"
on public.memories for insert
to authenticated
with check (
  public.can_access_memories(circle_id)
  and author_id = (select auth.uid())
);

create policy "family and recipient update memories"
on public.memories for update
to authenticated
using (public.can_access_memories(circle_id))
with check (public.can_access_memories(circle_id));

alter table public.care_events replica identity full;
alter table public.tasks replica identity full;
alter table public.memories replica identity full;

do $$
declare
  realtime_table text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  foreach realtime_table in array array['care_events', 'tasks', 'memories'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table
      );
    end if;
  end loop;
end
$$;
