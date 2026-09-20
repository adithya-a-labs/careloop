-- The helper is used by authenticated RLS policies, but must not be callable
-- by anonymous clients as a public RPC.
revoke all on function public.is_circle_member(uuid) from public;
revoke all on function public.is_circle_member(uuid) from anon;
grant execute on function public.is_circle_member(uuid) to authenticated;
