-- Students can log cardio on their own (a run, a bike ride) without a
-- prescribed plan, with distance, so running streaks and medals have data.
alter table public.cardio_logs
  alter column cardio_plan_id drop not null,
  add column modality text,
  add column distance_km numeric(6,2) check (distance_km > 0 and distance_km <= 500),
  add constraint cardio_logs_plan_or_modality check (cardio_plan_id is not null or modality is not null);

create index if not exists cardio_logs_student_completed_idx on public.cardio_logs (student_id, completed_at desc);

-- Free logs have no plan, so professionals read them through the link.
drop policy "cardio logs participants read" on public.cardio_logs;
create policy "cardio logs participants read" on public.cardio_logs
for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.professional_students ps
    where ps.student_id = cardio_logs.student_id and ps.professional_id = (select auth.uid())
  )
);

-- A plan id, when given, must be one of the student's own plans.
drop policy "cardio logs student inserts" on public.cardio_logs;
create policy "cardio logs student inserts" on public.cardio_logs
for insert to authenticated
with check (
  student_id = (select auth.uid())
  and (
    cardio_plan_id is null
    or exists (select 1 from public.cardio_plans cp where cp.id = cardio_plan_id and cp.student_id = (select auth.uid()))
  )
);
