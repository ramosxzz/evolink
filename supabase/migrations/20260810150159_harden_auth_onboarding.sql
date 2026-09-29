-- Keep account provisioning atomic with auth.users while making the trigger
-- resilient to incomplete provider metadata.
create or replace function public.create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.user_role;
  requested_name text;
begin
  requested_role := case lower(coalesce(new.raw_user_meta_data ->> 'role', 'student'))
    when 'professional' then 'professional'::public.user_role
    else 'student'::public.user_role
  end;

  requested_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Usuário Evolink'
  );

  insert into public.profiles (id, full_name, role)
  values (new.id, requested_name, requested_role);

  if requested_role = 'professional' then
    insert into public.professional_profiles (id) values (new.id);
  else
    insert into public.student_profiles (id) values (new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.create_student_profile() from public, anon, authenticated;
