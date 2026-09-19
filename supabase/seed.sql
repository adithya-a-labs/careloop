-- Fully synthetic, deterministic local-demo identities and family state.
-- Do not reuse these credentials or records outside local/demo environments.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token,
  is_super_admin, last_sign_in_at,
  created_at, updated_at
)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'amma@demo.careloop', crypt('careloop-demo', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, '', '', '', '', '', '', '', '', false, now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya@demo.careloop', crypt('careloop-demo', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, '', '', '', '', '', '', '', '', false, now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rahul@demo.careloop', crypt('careloop-demo', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, '', '', '', '', '', '', '', '', false, now(), now(), now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anu@demo.careloop', crypt('careloop-demo', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, '', '', '', '', '', '', '', '', false, now(), now(), now())
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change = excluded.email_change,
  email_change_token_new = excluded.email_change_token_new,
  email_change_token_current = excluded.email_change_token_current,
  phone_change = excluded.phone_change,
  phone_change_token = excluded.phone_change_token,
  reauthentication_token = excluded.reauthentication_token,
  is_super_admin = excluded.is_super_admin,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = excluded.updated_at;

update auth.identities
set provider_id = user_id::text, updated_at = now()
where user_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004'
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, created_at, updated_at
)
select
  id::text,
  id,
  jsonb_build_object(
    'sub', id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now()
from auth.users
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004'
)
on conflict (provider_id, provider) do update set
  identity_data = excluded.identity_data,
  updated_at = excluded.updated_at;

insert into public.profiles (id, display_name, age_range, preferred_language, preferences)
values
  ('10000000-0000-0000-0000-000000000001', 'Amma', '65+', 'ml', '{"demo": true}'::jsonb),
  ('10000000-0000-0000-0000-000000000002', 'Maya', '18-64', 'en', '{"demo": true}'::jsonb),
  ('10000000-0000-0000-0000-000000000003', 'Rahul', '18-64', 'en', '{"demo": true}'::jsonb),
  ('10000000-0000-0000-0000-000000000004', 'Anu', '18-64', 'ml', '{"demo": true}'::jsonb)
on conflict (id) do update set
  display_name = excluded.display_name,
  age_range = excluded.age_range,
  preferred_language = excluded.preferred_language,
  preferences = excluded.preferences;

insert into public.care_circles (id, name, created_by, invite_code)
values (
  '20000000-0000-0000-0000-000000000001',
  'Amma''s Care Circle',
  '10000000-0000-0000-0000-000000000002',
  'AMMA-DEMO'
)
on conflict (id) do update set
  name = excluded.name,
  created_by = excluded.created_by,
  invite_code = excluded.invite_code;

insert into public.circle_members (circle_id, profile_id, role, relationship, is_active)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'patient', 'patient', true),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'family', 'daughter', true),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'family', 'son', true),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'caregiver', 'home nurse', true)
on conflict (circle_id, profile_id) do update set
  role = excluded.role,
  relationship = excluded.relationship,
  is_active = excluded.is_active;

insert into public.care_events (
  id, circle_id, subject_id, reported_by, event_type, event_data,
  source, raw_transcript, confidence, occurred_at, created_at
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'meal',
    '{"meal": "lunch", "intake": "low"}'::jsonb,
    'manual',
    'Amma didn''t eat much at lunch.',
    0.98,
    date_trunc('day', now()) + interval '13 hours',
    date_trunc('day', now()) + interval '13 hours 5 minutes'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    'visit',
    '{"visit_type": "home_nurse", "status": "completed"}'::jsonb,
    'manual',
    null,
    null,
    date_trunc('day', now()) + interval '15 hours',
    date_trunc('day', now()) + interval '15 hours 5 minutes'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'check_in',
    '{"mood": "okay", "note": "Morning voice check-in completed"}'::jsonb,
    'voice',
    'I am doing okay this morning.',
    0.96,
    date_trunc('day', now()) + interval '8 hours',
    date_trunc('day', now()) + interval '8 hours 1 minute'
  )
on conflict (id) do update set
  event_data = excluded.event_data,
  occurred_at = excluded.occurred_at,
  created_at = excluded.created_at;

insert into public.tasks (
  id, circle_id, title, description, created_by, assigned_to, status,
  priority, due_at, completed_at, source_event_id, created_at, updated_at
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Pick up prescription',
    'Collect the prepared prescription from the pharmacy.',
    '10000000-0000-0000-0000-000000000002',
    null,
    'pending',
    'high',
    (
      (now() at time zone 'Asia/Kolkata')::date + interval '1 day 15 hours'
    ) at time zone 'Asia/Kolkata',
    null,
    null,
    date_trunc('day', now()) + interval '9 hours',
    date_trunc('day', now()) + interval '9 hours'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    'Evening medicine check',
    'Confirm that the usual evening medicine routine was completed.',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    'pending',
    'medium',
    date_trunc('day', now()) + interval '20 hours',
    null,
    null,
    date_trunc('day', now()) + interval '9 hours 5 minutes',
    date_trunc('day', now()) + interval '9 hours 5 minutes'
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  assigned_to = excluded.assigned_to,
  status = excluded.status,
  priority = excluded.priority,
  due_at = excluded.due_at,
  completed_at = excluded.completed_at,
  updated_at = excluded.updated_at;

insert into public.scheduled_items (
  id, circle_id, created_by, title, starts_at, ends_at, recurrence_rule, created_at
)
values (
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Evening family call',
  (
    (now() at time zone 'Asia/Kolkata')::date + interval '1 day 19 hours'
  ) at time zone 'Asia/Kolkata',
  (
    (now() at time zone 'Asia/Kolkata')::date + interval '1 day 19 hours 30 minutes'
  ) at time zone 'Asia/Kolkata',
  null,
  date_trunc('day', now()) + interval '9 hours'
)
on conflict (id) do update set
  title = excluded.title,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at;

insert into public.memories (
  id, circle_id, author_id, subject_id, kind, title, body,
  approximate_year, created_at
)
values (
  '60000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'story',
  'My first job',
  'Amma remembers starting her first job around 1978.',
  1978,
  date_trunc('day', now()) - interval '2 days'
)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  approximate_year = excluded.approximate_year;

insert into public.availability (
  id, circle_id, profile_id, starts_at, ends_at, note
)
values (
  '70000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  (
    (now() at time zone 'Asia/Kolkata')::date + interval '1 day 13 hours'
  ) at time zone 'Asia/Kolkata',
  (
    (now() at time zone 'Asia/Kolkata')::date + interval '1 day 17 hours'
  ) at time zone 'Asia/Kolkata',
  'Available tomorrow afternoon'
)
on conflict (id) do update set
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  note = excluded.note;
