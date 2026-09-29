alter table public.workout_plans
  add column starts_on date not null default current_date,
  add column ends_on date,
  add constraint workout_plans_validity_check
    check (ends_on is null or ends_on >= starts_on);
