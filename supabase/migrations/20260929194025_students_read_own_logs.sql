-- Students could write water and meal logs but not read them back (the old
-- "for all" policy was split without a student SELECT), so the home screen
-- showed zero after every reload.
create policy "water logs student reads" on public.water_logs for select to authenticated
  using (student_id = (select auth.uid()));
create policy "meal logs student reads" on public.meal_logs for select to authenticated
  using (student_id = (select auth.uid()));
