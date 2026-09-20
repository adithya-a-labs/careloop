-- Preserve the existing authorization rules while allowing Postgres to cache
-- auth.uid() once per statement instead of recomputing it for every row.

drop policy if exists "profiles readable by self or shared circle" on public.profiles;
create policy "profiles readable by self or shared circle"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or exists(
    select 1
    from public.circle_members mine
    join public.circle_members theirs using (circle_id)
    where mine.profile_id = (select auth.uid())
      and theirs.profile_id = profiles.id
  )
);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert"
on public.profiles for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists "authenticated create circles" on public.care_circles;
create policy "authenticated create circles"
on public.care_circles for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "circle creator adds first member" on public.circle_members;
create policy "circle creator adds first member"
on public.circle_members for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists(
    select 1
    from public.care_circles
    where id = circle_id
      and created_by = (select auth.uid())
  )
);

drop policy if exists "care_events members insert" on public.care_events;
create policy "care_events members insert"
on public.care_events for insert
to authenticated
with check (
  public.is_circle_member(circle_id)
  and reported_by = (select auth.uid())
);

drop policy if exists "tasks members insert" on public.tasks;
create policy "tasks members insert"
on public.tasks for insert
to authenticated
with check (
  public.is_circle_member(circle_id)
  and created_by = (select auth.uid())
);
