-- Role is accepted only at account creation. Subsequent authorization always
-- comes from public.profiles and its RLS policies, never mutable user metadata.
create or replace function public.create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role := case lower(coalesce(new.raw_user_meta_data ->> 'role', 'student'))
    when 'professional' then 'professional'::public.user_role
    else 'student'::public.user_role
  end;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    requested_role
  );

  if requested_role = 'professional' then
    insert into public.professional_profiles (id) values (new.id);
  else
    insert into public.student_profiles (id) values (new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.create_student_profile() from public, anon, authenticated;
