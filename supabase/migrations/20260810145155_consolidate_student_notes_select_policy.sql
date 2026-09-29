drop policy if exists "student notes professional reads" on public.student_notes;
drop policy if exists "student notes student reads shared" on public.student_notes;

create policy "student notes permitted reads"
on public.student_notes
for select
to authenticated
using (
  professional_id = (select auth.uid())
  or (student_id = (select auth.uid()) and not is_private)
);
