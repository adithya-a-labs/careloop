-- Evolve the initial scaffold into the integration contract used by the web
-- and voice workstreams. Existing rows are backfilled before constraints tighten.

alter table public.profiles
  add column if not exists preferred_language text not null default 'en'
    check (char_length(preferred_language) between 2 and 16);

alter table public.circle_members
  add column if not exists relationship text,
  add column if not exists is_active boolean not null default true;

alter table public.care_events rename column author_id to reported_by;
alter table public.care_events rename column kind to event_type;
alter table public.care_events
  add column subject_id uuid references public.profiles(id),
  add column event_data jsonb not null default '{}'::jsonb,
  add column source text not null default 'manual'
    check (source in ('manual', 'voice', 'import', 'system')),
  add column raw_transcript text,
  add column confidence numeric(4, 3)
    check (confidence is null or confidence between 0 and 1);

update public.care_events
set
  subject_id = reported_by,
  event_data = jsonb_strip_nulls(
    jsonb_build_object('title', title, 'details', details)
  )
where subject_id is null;

alter table public.care_events
  alter column subject_id set not null,
  alter column title drop not null,
  add constraint care_events_event_type_length
    check (char_length(event_type) between 1 and 48),
  add constraint care_events_raw_transcript_length
    check (raw_transcript is null or char_length(raw_transcript) <= 8000),
  add constraint care_events_circle_id_id_key unique (circle_id, id),
  add constraint care_events_subject_membership_fkey
    foreign key (circle_id, subject_id)
    references public.circle_members(circle_id, profile_id),
  add constraint care_events_reporter_membership_fkey
    foreign key (circle_id, reported_by)
    references public.circle_members(circle_id, profile_id);

alter table public.tasks rename column assignee_id to assigned_to;
alter table public.tasks rename column notes to description;
alter table public.tasks
  add column priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  add column completed_at timestamptz,
  add column source_event_id uuid,
  add column updated_at timestamptz not null default now(),
  alter column status set default 'pending',
  add constraint tasks_created_by_membership_fkey
    foreign key (circle_id, created_by)
    references public.circle_members(circle_id, profile_id),
  add constraint tasks_assignee_membership_fkey
    foreign key (circle_id, assigned_to)
    references public.circle_members(circle_id, profile_id),
  add constraint tasks_source_event_fkey
    foreign key (circle_id, source_event_id)
    references public.care_events(circle_id, id) on delete restrict,
  add constraint tasks_completion_consistency
    check (
      (status in ('done', 'completed') and completed_at is not null)
      or (status not in ('done', 'completed') and completed_at is null)
    );

alter table public.scheduled_items
  add constraint scheduled_items_creator_membership_fkey
    foreign key (circle_id, created_by)
    references public.circle_members(circle_id, profile_id);

alter table public.handoffs
  add constraint handoffs_from_membership_fkey
    foreign key (circle_id, from_profile_id)
    references public.circle_members(circle_id, profile_id),
  add constraint handoffs_to_membership_fkey
    foreign key (circle_id, to_profile_id)
    references public.circle_members(circle_id, profile_id);

alter table public.memories
  add column if not exists subject_id uuid references public.profiles(id),
  add column if not exists approximate_year integer
    check (approximate_year is null or approximate_year between 1900 and 2100);

update public.memories set subject_id = author_id where subject_id is null;

alter table public.memories
  alter column subject_id set not null,
  add constraint memories_author_membership_fkey
    foreign key (circle_id, author_id)
    references public.circle_members(circle_id, profile_id),
  add constraint memories_subject_membership_fkey
    foreign key (circle_id, subject_id)
    references public.circle_members(circle_id, profile_id);

alter table public.availability
  add constraint availability_profile_membership_fkey
    foreign key (circle_id, profile_id)
    references public.circle_members(circle_id, profile_id);

create index if not exists circle_members_profile_idx
  on public.circle_members(profile_id, circle_id) where is_active;
create index if not exists care_events_circle_created_idx
  on public.care_events(circle_id, created_at desc);
create index if not exists care_events_subject_time_idx
  on public.care_events(circle_id, subject_id, occurred_at desc);
create index if not exists tasks_circle_due_idx
  on public.tasks(circle_id, due_at) where status not in ('done', 'completed', 'cancelled');
create index if not exists tasks_assignee_status_idx
  on public.tasks(circle_id, assigned_to, status);
create index if not exists scheduled_items_circle_time_idx
  on public.scheduled_items(circle_id, starts_at);
create index if not exists handoffs_circle_created_idx
  on public.handoffs(circle_id, created_at desc);
create index if not exists memories_circle_created_idx
  on public.memories(circle_id, created_at desc);

create or replace function public.is_circle_member(target_circle uuid)
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
  )
$$;

-- Actor attribution must not be caller-controlled when requests use the
-- authenticated Supabase API directly. The FastAPI service repeats these checks.
drop policy if exists "care_events members insert" on public.care_events;
create policy "care_events members insert"
on public.care_events for insert
with check (
  public.is_circle_member(circle_id)
  and reported_by = auth.uid()
);

drop policy if exists "tasks members insert" on public.tasks;
create policy "tasks members insert"
on public.tasks for insert
with check (
  public.is_circle_member(circle_id)
  and created_by = auth.uid()
);

alter table public.care_events replica identity full;
alter table public.tasks replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'care_events'
    ) then
      execute 'alter publication supabase_realtime add table public.care_events';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'tasks'
    ) then
      execute 'alter publication supabase_realtime add table public.tasks';
    end if;
  end if;
end
$$;
