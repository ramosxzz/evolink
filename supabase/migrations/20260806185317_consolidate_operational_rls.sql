drop policy "exercise media owner manages" on public.exercise_media;
drop policy "exercise media linked students read" on public.exercise_media;
drop policy "exercise logs student manages" on public.workout_exercise_logs;
drop policy "exercise logs professional reads" on public.workout_exercise_logs;

create policy "exercise media permitted reads" on public.exercise_media for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.workout_exercises we
    join public.workout_plans wp on wp.id = we.workout_plan_id
    where we.media_id = exercise_media.id and wp.student_id = (select auth.uid())
  )
);

create policy "exercise media owner inserts" on public.exercise_media for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "exercise media owner updates" on public.exercise_media for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "exercise media owner deletes" on public.exercise_media for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "exercise logs permitted reads" on public.workout_exercise_logs for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.professional_students ps
    where ps.professional_id = (select auth.uid()) and ps.student_id = workout_exercise_logs.student_id
  )
);

create policy "exercise logs student inserts" on public.workout_exercise_logs for insert to authenticated
with check (student_id = (select auth.uid()));

create policy "exercise logs student updates" on public.workout_exercise_logs for update to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy "exercise logs student deletes" on public.workout_exercise_logs for delete to authenticated
using (student_id = (select auth.uid()));
