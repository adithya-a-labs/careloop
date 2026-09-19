create extension if not exists pgcrypto;

create type public.circle_role as enum ('care_recipient', 'family', 'coordinator');
create type public.task_status as enum ('open', 'in_progress', 'done', 'cancelled');
create type public.handoff_status as enum ('draft', 'ready', 'acknowledged');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  age_range text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.care_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid not null references public.profiles(id),
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.circle_role not null,
  joined_at timestamptz not null default now(),
  primary key (circle_id, profile_id)
);

create table public.care_events (
  id uuid primary key default gen_random_uuid(), circle_id uuid not null references public.care_circles(id) on delete cascade,
  author_id uuid not null references public.profiles(id), kind text not null,
  title text not null, details text, occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index care_events_circle_time_idx on public.care_events(circle_id, occurred_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(), circle_id uuid not null references public.care_circles(id) on delete cascade,
  created_by uuid not null references public.profiles(id), assignee_id uuid references public.profiles(id),
  title text not null, notes text, status public.task_status not null default 'open', due_at timestamptz, created_at timestamptz not null default now()
);
create index tasks_circle_status_idx on public.tasks(circle_id, status);

create table public.scheduled_items (
  id uuid primary key default gen_random_uuid(), circle_id uuid not null references public.care_circles(id) on delete cascade,
  created_by uuid not null references public.profiles(id), title text not null, starts_at timestamptz not null,
  ends_at timestamptz, recurrence_rule text, created_at timestamptz not null default now()
);

create table public.handoffs (
  id uuid primary key default gen_random_uuid(), circle_id uuid not null references public.care_circles(id) on delete cascade,
  from_profile_id uuid not null references public.profiles(id), to_profile_id uuid references public.profiles(id),
  summary text not null, open_items jsonb not null default '[]'::jsonb,
  status public.handoff_status not null default 'draft', created_at timestamptz not null default now(), acknowledged_at timestamptz
);

create table public.memories (
  id uuid primary key default gen_random_uuid(), circle_id uuid not null references public.care_circles(id) on delete cascade,
  author_id uuid not null references public.profiles(id), kind text not null check (kind in ('photo','voice','story')),
  title text not null, body text, media_path text, created_at timestamptz not null default now()
);

create table public.availability (
  id uuid primary key default gen_random_uuid(), circle_id uuid not null references public.care_circles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade, starts_at timestamptz not null, ends_at timestamptz not null,
  note text, check (ends_at > starts_at)
);
create index availability_circle_time_idx on public.availability(circle_id, starts_at);

create or replace function public.is_circle_member(target_circle uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.circle_members where circle_id = target_circle and profile_id = auth.uid()) $$;

alter table public.profiles enable row level security;
alter table public.care_circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.care_events enable row level security;
alter table public.tasks enable row level security;
alter table public.scheduled_items enable row level security;
alter table public.handoffs enable row level security;
alter table public.memories enable row level security;
alter table public.availability enable row level security;

create policy "profiles readable by self or shared circle" on public.profiles for select using (
  id = auth.uid() or exists(select 1 from public.circle_members mine join public.circle_members theirs using(circle_id) where mine.profile_id = auth.uid() and theirs.profile_id = profiles.id)
);
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles self insert" on public.profiles for insert with check (id = auth.uid());
create policy "circles members read" on public.care_circles for select using (public.is_circle_member(id));
create policy "authenticated create circles" on public.care_circles for insert with check (created_by = auth.uid());
create policy "members read roster" on public.circle_members for select using (public.is_circle_member(circle_id));
create policy "circle creator adds first member" on public.circle_members for insert with check (
  profile_id = auth.uid() and exists(select 1 from public.care_circles where id = circle_id and created_by = auth.uid())
);

do $$ declare table_name text; begin
  foreach table_name in array array['care_events','tasks','scheduled_items','handoffs','memories','availability'] loop
    execute format('create policy %I on public.%I for select using (public.is_circle_member(circle_id))', table_name || ' members read', table_name);
    execute format('create policy %I on public.%I for insert with check (public.is_circle_member(circle_id))', table_name || ' members insert', table_name);
    execute format('create policy %I on public.%I for update using (public.is_circle_member(circle_id)) with check (public.is_circle_member(circle_id))', table_name || ' members update', table_name);
  end loop;
end $$;

revoke all on function public.is_circle_member(uuid) from public;
grant execute on function public.is_circle_member(uuid) to authenticated;
