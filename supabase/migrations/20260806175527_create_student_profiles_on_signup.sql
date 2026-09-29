-- Public self-registration is intentionally student-only. Professional accounts
-- are provisioned by an administrator, preventing role escalation via signup metadata.
create function public.create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'student'
  );

  insert into public.student_profiles (id)
  values (new.id);

  return new;
end;
$$;

revoke all on function public.create_student_profile() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_student_profile();
