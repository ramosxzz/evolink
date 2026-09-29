-- Split broad ALL policies by operation so participants keep simple reads without
-- paying for overlapping permissive RLS checks on every request.
drop policy "professionals manage foods" on public.foods;
create policy "professionals insert foods" on public.foods for insert to authenticated with check (exists (select 1 from public.professional_profiles pp where pp.id = (select auth.uid())));
create policy "professionals update foods" on public.foods for update to authenticated using (exists (select 1 from public.professional_profiles pp where pp.id = (select auth.uid()))) with check (exists (select 1 from public.professional_profiles pp where pp.id = (select auth.uid())));
create policy "professionals delete foods" on public.foods for delete to authenticated using (exists (select 1 from public.professional_profiles pp where pp.id = (select auth.uid())));

drop policy "diet plans professional writes" on public.diet_plans;
create policy "diet plans professional inserts" on public.diet_plans for insert to authenticated with check (professional_id = (select auth.uid()));
create policy "diet plans professional updates" on public.diet_plans for update to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "diet plans professional deletes" on public.diet_plans for delete to authenticated using (professional_id = (select auth.uid()));

drop policy "meals plan professional writes" on public.meals;
create policy "meals professional inserts" on public.meals for insert to authenticated with check (exists (select 1 from public.diet_plans dp where dp.id = meals.diet_plan_id and dp.professional_id = (select auth.uid())));
create policy "meals professional updates" on public.meals for update to authenticated using (exists (select 1 from public.diet_plans dp where dp.id = meals.diet_plan_id and dp.professional_id = (select auth.uid()))) with check (exists (select 1 from public.diet_plans dp where dp.id = meals.diet_plan_id and dp.professional_id = (select auth.uid())));
create policy "meals professional deletes" on public.meals for delete to authenticated using (exists (select 1 from public.diet_plans dp where dp.id = meals.diet_plan_id and dp.professional_id = (select auth.uid())));

drop policy "meal items professional writes" on public.meal_items;
create policy "meal items professional inserts" on public.meal_items for insert to authenticated with check (exists (select 1 from public.meals m join public.diet_plans dp on dp.id = m.diet_plan_id where m.id = meal_items.meal_id and dp.professional_id = (select auth.uid())));
create policy "meal items professional updates" on public.meal_items for update to authenticated using (exists (select 1 from public.meals m join public.diet_plans dp on dp.id = m.diet_plan_id where m.id = meal_items.meal_id and dp.professional_id = (select auth.uid()))) with check (exists (select 1 from public.meals m join public.diet_plans dp on dp.id = m.diet_plan_id where m.id = meal_items.meal_id and dp.professional_id = (select auth.uid())));
create policy "meal items professional deletes" on public.meal_items for delete to authenticated using (exists (select 1 from public.meals m join public.diet_plans dp on dp.id = m.diet_plan_id where m.id = meal_items.meal_id and dp.professional_id = (select auth.uid())));

drop policy "meal logs student writes" on public.meal_logs;
create policy "meal logs student inserts" on public.meal_logs for insert to authenticated with check (student_id = (select auth.uid()));
create policy "meal logs student updates" on public.meal_logs for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "meal logs student deletes" on public.meal_logs for delete to authenticated using (student_id = (select auth.uid()));

drop policy "workouts professional writes" on public.workout_plans;
create policy "workouts professional inserts" on public.workout_plans for insert to authenticated with check (professional_id = (select auth.uid()));
create policy "workouts professional updates" on public.workout_plans for update to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "workouts professional deletes" on public.workout_plans for delete to authenticated using (professional_id = (select auth.uid()));

drop policy "exercises professional writes" on public.workout_exercises;
create policy "exercises professional inserts" on public.workout_exercises for insert to authenticated with check (exists (select 1 from public.workout_plans wp where wp.id = workout_exercises.workout_plan_id and wp.professional_id = (select auth.uid())));
create policy "exercises professional updates" on public.workout_exercises for update to authenticated using (exists (select 1 from public.workout_plans wp where wp.id = workout_exercises.workout_plan_id and wp.professional_id = (select auth.uid()))) with check (exists (select 1 from public.workout_plans wp where wp.id = workout_exercises.workout_plan_id and wp.professional_id = (select auth.uid())));
create policy "exercises professional deletes" on public.workout_exercises for delete to authenticated using (exists (select 1 from public.workout_plans wp where wp.id = workout_exercises.workout_plan_id and wp.professional_id = (select auth.uid())));

drop policy "workout logs student writes" on public.workout_logs;
create policy "workout logs student inserts" on public.workout_logs for insert to authenticated with check (student_id = (select auth.uid()));
create policy "workout logs student updates" on public.workout_logs for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "workout logs student deletes" on public.workout_logs for delete to authenticated using (student_id = (select auth.uid()));

drop policy "water logs student writes" on public.water_logs;
create policy "water logs student inserts" on public.water_logs for insert to authenticated with check (student_id = (select auth.uid()));
create policy "water logs student updates" on public.water_logs for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "water logs student deletes" on public.water_logs for delete to authenticated using (student_id = (select auth.uid()));

drop policy "checkins student updates drafts" on public.check_ins;
drop policy "checkins professional updates" on public.check_ins;
create policy "checkins participant updates" on public.check_ins for update to authenticated using ((student_id = (select auth.uid()) and status in ('draft', 'submitted')) or professional_id = (select auth.uid())) with check ((student_id = (select auth.uid())) or professional_id = (select auth.uid()));

drop policy "progress student writes" on public.progress_records;
create policy "progress student inserts" on public.progress_records for insert to authenticated with check (student_id = (select auth.uid()));
create policy "progress student updates" on public.progress_records for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "progress student deletes" on public.progress_records for delete to authenticated using (student_id = (select auth.uid()));

drop policy "photos student writes" on public.progress_photos;
create policy "photos student inserts" on public.progress_photos for insert to authenticated with check (student_id = (select auth.uid()));
create policy "photos student updates" on public.progress_photos for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "photos student deletes" on public.progress_photos for delete to authenticated using (student_id = (select auth.uid()));
