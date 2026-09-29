-- Students could not read their own professional's profile, so the app
-- never resolved who their coach was: chat and weekly check-ins stayed
-- blocked with "Vincule um profissional". Allow reading the profile of an
-- actively linked professional.
drop policy "profiles read own or linked" on public.profiles;

create policy "profiles read own or linked" on public.profiles
for select to authenticated
using (
  (select auth.uid()) = id
  or exists (
    select 1 from public.professional_students ps
    where ps.professional_id = (select auth.uid()) and ps.student_id = profiles.id
  )
  or exists (
    select 1 from public.professional_students ps
    where ps.student_id = (select auth.uid()) and ps.professional_id = profiles.id and ps.status = 'active'
  )
);
