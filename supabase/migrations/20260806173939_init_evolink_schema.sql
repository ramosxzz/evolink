-- Evolink: auth identities live in auth.users. Every application table uses RLS.
create type public.user_role as enum ('student', 'professional');
create type public.plan_status as enum ('draft', 'published', 'archived');
create type public.checkin_status as enum ('draft', 'submitted', 'reviewed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  phone text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.professional_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  specialty text,
  registration_number text,
  bio text,
  created_at timestamptz not null default now()
);

create table public.student_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  goal text,
  started_at date,
  initial_weight_kg numeric(5,2),
  target_weight_kg numeric(5,2),
  daily_water_goal_ml integer not null default 2500 check (daily_water_goal_ml between 500 and 10000),
  created_at timestamptz not null default now()
);

create table public.professional_students (
  professional_id uuid not null references public.professional_profiles(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  primary key (professional_id, student_id)
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  serving_description text,
  calories numeric(7,2),
  protein_g numeric(7,2),
  carbohydrates_g numeric(7,2),
  fat_g numeric(7,2),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  professional_id uuid not null references public.professional_profiles(id) on delete restrict,
  title text not null,
  notes text,
  status public.plan_status not null default 'draft',
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  diet_plan_id uuid not null references public.diet_plans(id) on delete cascade,
  name text not null,
  scheduled_time time,
  position smallint not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  description text not null,
  quantity numeric(8,2),
  unit text,
  position smallint not null default 0,
  substitutions jsonb not null default '[]'::jsonb
);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  logged_for date not null default current_date,
  completed_at timestamptz,
  note text,
  unique (student_id, meal_id, logged_for)
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  professional_id uuid not null references public.professional_profiles(id) on delete restrict,
  title text not null,
  objective text,
  estimated_minutes smallint,
  status public.plan_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  name text not null,
  muscle_group text,
  video_url text,
  sets smallint,
  repetitions text,
  rest_seconds smallint,
  suggested_load text,
  notes text,
  position smallint not null default 0
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  completed_at timestamptz,
  duration_seconds integer,
  notes text,
  created_at timestamptz not null default now()
);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  amount_ml integer not null check (amount_ml between 1 and 3000),
  logged_at timestamptz not null default now()
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  professional_id uuid not null references public.professional_profiles(id) on delete restrict,
  status public.checkin_status not null default 'draft',
  week_of date not null,
  nutrition_score smallint check (nutrition_score between 1 and 5),
  training_days smallint check (training_days between 0 and 7),
  energy_score smallint check (energy_score between 1 and 5),
  sleep_score smallint check (sleep_score between 1 and 5),
  stress_score smallint check (stress_score between 1 and 5),
  current_weight_kg numeric(5,2),
  difficulties text,
  discomfort text,
  student_message text,
  professional_feedback text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, week_of)
);

create table public.progress_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  recorded_on date not null default current_date,
  weight_kg numeric(5,2),
  waist_cm numeric(5,2),
  abdomen_cm numeric(5,2),
  hip_cm numeric(5,2),
  arm_cm numeric(5,2),
  thigh_cm numeric(5,2),
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, recorded_on)
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  progress_record_id uuid references public.progress_records(id) on delete set null,
  storage_path text not null unique,
  angle text not null check (angle in ('front', 'side', 'back')),
  taken_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  attachment_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check ((body is not null and length(trim(body)) > 0) or attachment_path is not null)
);

create index professional_students_student_idx on public.professional_students(student_id);
create index diet_plans_student_idx on public.diet_plans(student_id, status);
create index workout_plans_student_idx on public.workout_plans(student_id, status);
create index water_logs_student_logged_idx on public.water_logs(student_id, logged_at desc);
create index messages_participants_idx on public.messages(sender_id, recipient_id, created_at desc);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger diet_plans_updated_at before update on public.diet_plans for each row execute function public.set_updated_at();
create trigger workout_plans_updated_at before update on public.workout_plans for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.professional_students enable row level security;
alter table public.foods enable row level security;
alter table public.diet_plans enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_logs enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.check_ins enable row level security;
alter table public.progress_records enable row level security;
alter table public.progress_photos enable row level security;
alter table public.messages enable row level security;

-- Relationship visibility is constrained to the two people in the relationship.
create policy "profiles read own or linked" on public.profiles for select to authenticated using (
  (select auth.uid()) = id or exists (select 1 from public.professional_students ps where ps.professional_id = (select auth.uid()) and ps.student_id = profiles.id)
);
create policy "profiles update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "professional profiles read linked" on public.professional_profiles for select to authenticated using (id = (select auth.uid()) or exists (select 1 from public.professional_students ps where ps.student_id = (select auth.uid()) and ps.professional_id = professional_profiles.id));
create policy "student profiles read linked" on public.student_profiles for select to authenticated using (id = (select auth.uid()) or exists (select 1 from public.professional_students ps where ps.professional_id = (select auth.uid()) and ps.student_id = student_profiles.id));
create policy "student profiles update self" on public.student_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "relationships read participants" on public.professional_students for select to authenticated using (professional_id = (select auth.uid()) or student_id = (select auth.uid()));

create policy "foods read authenticated" on public.foods for select to authenticated using (true);
create policy "professionals manage foods" on public.foods for all to authenticated using (exists (select 1 from public.professional_profiles pp where pp.id = (select auth.uid()))) with check (exists (select 1 from public.professional_profiles pp where pp.id = (select auth.uid())));

create policy "diet plans participants read" on public.diet_plans for select to authenticated using (student_id = (select auth.uid()) or professional_id = (select auth.uid()));
create policy "diet plans professional writes" on public.diet_plans for all to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "meals plan participants read" on public.meals for select to authenticated using (exists (select 1 from public.diet_plans dp where dp.id = meals.diet_plan_id and (dp.student_id = (select auth.uid()) or dp.professional_id = (select auth.uid()))));
create policy "meals plan professional writes" on public.meals for all to authenticated using (exists (select 1 from public.diet_plans dp where dp.id = meals.diet_plan_id and dp.professional_id = (select auth.uid()))) with check (exists (select 1 from public.diet_plans dp where dp.id = meals.diet_plan_id and dp.professional_id = (select auth.uid())));
create policy "meal items plan participants read" on public.meal_items for select to authenticated using (exists (select 1 from public.meals m join public.diet_plans dp on dp.id = m.diet_plan_id where m.id = meal_items.meal_id and (dp.student_id = (select auth.uid()) or dp.professional_id = (select auth.uid()))));
create policy "meal items professional writes" on public.meal_items for all to authenticated using (exists (select 1 from public.meals m join public.diet_plans dp on dp.id = m.diet_plan_id where m.id = meal_items.meal_id and dp.professional_id = (select auth.uid()))) with check (exists (select 1 from public.meals m join public.diet_plans dp on dp.id = m.diet_plan_id where m.id = meal_items.meal_id and dp.professional_id = (select auth.uid())));
create policy "meal logs student writes" on public.meal_logs for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "meal logs professional reads" on public.meal_logs for select to authenticated using (exists (select 1 from public.professional_students ps where ps.professional_id = (select auth.uid()) and ps.student_id = meal_logs.student_id));

create policy "workouts participants read" on public.workout_plans for select to authenticated using (student_id = (select auth.uid()) or professional_id = (select auth.uid()));
create policy "workouts professional writes" on public.workout_plans for all to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "exercises participants read" on public.workout_exercises for select to authenticated using (exists (select 1 from public.workout_plans wp where wp.id = workout_exercises.workout_plan_id and (wp.student_id = (select auth.uid()) or wp.professional_id = (select auth.uid()))));
create policy "exercises professional writes" on public.workout_exercises for all to authenticated using (exists (select 1 from public.workout_plans wp where wp.id = workout_exercises.workout_plan_id and wp.professional_id = (select auth.uid()))) with check (exists (select 1 from public.workout_plans wp where wp.id = workout_exercises.workout_plan_id and wp.professional_id = (select auth.uid())));
create policy "workout logs student writes" on public.workout_logs for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "workout logs professional reads" on public.workout_logs for select to authenticated using (exists (select 1 from public.professional_students ps where ps.professional_id = (select auth.uid()) and ps.student_id = workout_logs.student_id));
create policy "water logs student writes" on public.water_logs for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "water logs professional reads" on public.water_logs for select to authenticated using (exists (select 1 from public.professional_students ps where ps.professional_id = (select auth.uid()) and ps.student_id = water_logs.student_id));

create policy "checkins participants read" on public.check_ins for select to authenticated using (student_id = (select auth.uid()) or professional_id = (select auth.uid()));
create policy "checkins student creates" on public.check_ins for insert to authenticated with check (student_id = (select auth.uid()));
create policy "checkins student updates drafts" on public.check_ins for update to authenticated using (student_id = (select auth.uid()) and status in ('draft', 'submitted')) with check (student_id = (select auth.uid()));
create policy "checkins professional updates" on public.check_ins for update to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "progress participants read" on public.progress_records for select to authenticated using (student_id = (select auth.uid()) or exists (select 1 from public.professional_students ps where ps.professional_id = (select auth.uid()) and ps.student_id = progress_records.student_id));
create policy "progress student writes" on public.progress_records for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "photos participants read" on public.progress_photos for select to authenticated using (student_id = (select auth.uid()) or exists (select 1 from public.professional_students ps where ps.professional_id = (select auth.uid()) and ps.student_id = progress_photos.student_id));
create policy "photos student writes" on public.progress_photos for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "messages participants read" on public.messages for select to authenticated using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "messages sender inserts" on public.messages for insert to authenticated with check (sender_id = (select auth.uid()));
create policy "messages recipient updates" on public.messages for update to authenticated using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

insert into storage.buckets (id, name, public) values ('progress-media', 'progress-media', false) on conflict (id) do nothing;
create policy "progress media participants read" on storage.objects for select to authenticated using (bucket_id = 'progress-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "progress media professionals read" on storage.objects for select to authenticated using (bucket_id = 'progress-media' and exists (select 1 from public.professional_students ps where ps.professional_id = (select auth.uid()) and ps.student_id::text = (storage.foldername(name))[1]));
create policy "progress media students upload" on storage.objects for insert to authenticated with check (bucket_id = 'progress-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "progress media students update" on storage.objects for update to authenticated using (bucket_id = 'progress-media' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'progress-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "progress media students delete" on storage.objects for delete to authenticated using (bucket_id = 'progress-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
