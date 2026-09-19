-- Synthetic local-demo identities. Do not use these credentials or records in production.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'meera@demo.careloop', crypt('careloop-demo', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya@demo.careloop', crypt('careloop-demo', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'arjun@demo.careloop', crypt('careloop-demo', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, age_range) values
  ('10000000-0000-0000-0000-000000000001', 'Meera', '65+'),
  ('10000000-0000-0000-0000-000000000002', 'Priya', '18-64'),
  ('10000000-0000-0000-0000-000000000003', 'Arjun', '18-64') on conflict (id) do nothing;

insert into public.care_circles (id, name, created_by, invite_code) values
  ('20000000-0000-0000-0000-000000000001', 'The Sharma family', '10000000-0000-0000-0000-000000000002', 'CARE42') on conflict (id) do nothing;

insert into public.circle_members (circle_id, profile_id, role) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'care_recipient'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'family'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'family') on conflict do nothing;

insert into public.tasks (circle_id, created_by, assignee_id, title, due_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Pick up prescription', now() + interval '4 hours'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', null, 'Confirm evening visit', now() + interval '8 hours');

insert into public.care_events (circle_id, author_id, kind, title, details) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'check-in', 'Morning check-in completed', 'Meera is feeling cheerful and had breakfast.');

insert into public.memories (circle_id, author_id, kind, title, body) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'story', 'Sunday lunch', 'Everyone shared lunch together.');
