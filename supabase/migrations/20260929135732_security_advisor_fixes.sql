-- coach_access is only used inside SECURITY DEFINER functions.
revoke execute on function public.coach_access(uuid) from authenticated;

-- Keep pg_net out of the public schema (its API stays in the net schema).
drop extension if exists pg_net;
create extension pg_net with schema extensions;
