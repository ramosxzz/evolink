-- Evolink consulting suite: billing, student 360, reusable plans,
-- advanced workout execution, cardio, habits and check-in history.

alter table public.profiles
  add column last_seen_at timestamptz;

alter table public.student_profiles
  add column access_status text not null default 'active'
    check (access_status in ('active', 'suspended')),
  add column suspension_reason text;

alter table public.diet_plans
  add column show_macros_to_student boolean not null default true,
  add column calories_total numeric(8,2),
  add column protein_total_g numeric(8,2),
  add column carbohydrates_total_g numeric(8,2),
  add column fat_total_g numeric(8,2);

alter table public.meals
  add column calories numeric(8,2),
  add column protein_g numeric(8,2),
  add column carbohydrates_g numeric(8,2),
  add column fat_g numeric(8,2);

alter table public.meal_items
  add column calories numeric(8,2),
  add column protein_g numeric(8,2),
  add column carbohydrates_g numeric(8,2),
  add column fat_g numeric(8,2);

alter table public.workout_exercises
  add column technique text,
  add column target_rir numeric(3,1),
  add column target_rpe numeric(3,1);

alter table public.workout_exercise_logs
  add column set_number smallint,
  add column repetitions_completed smallint,
  add column rir numeric(3,1),
  add column rpe numeric(3,1),
  add column rest_seconds integer;

alter table public.check_ins
  add column hunger_score smallint check (hunger_score between 1 and 5),
  add column performance_score smallint check (performance_score between 1 and 5),
  add column digestion_score smallint check (digestion_score between 1 and 5),
  add column bowel_score smallint check (bowel_score between 1 and 5),
  add column diet_adherence_percent smallint check (diet_adherence_percent between 0 and 100),
  add column cardio_adherence_percent smallint check (cardio_adherence_percent between 0 and 100),
  add column measurements jsonb not null default '{}'::jsonb,
  add column photo_paths jsonb not null default '{}'::jsonb;

alter type public.notification_kind add value if not exists 'cardio';
alter type public.notification_kind add value if not exists 'habit';
alter type public.notification_kind add value if not exists 'payment';

create table public.student_subscriptions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  due_day smallint not null check (due_day between 1 and 28),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  auto_suspend boolean not null default true,
  grace_days smallint not null default 3 check (grace_days between 0 and 30),
  started_on date not null default current_date,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id, student_id)
);

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.student_subscriptions(id) on delete cascade,
  due_date date not null,
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'waived')),
  paid_at timestamptz,
  payment_method text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, due_date)
);

create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(id) on delete cascade,
  kind text not null check (kind in ('diet', 'workout')),
  title text not null,
  description text,
  content jsonb not null default '{}'::jsonb,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_item_substitutions (
  id uuid primary key default gen_random_uuid(),
  meal_item_id uuid not null references public.meal_items(id) on delete cascade,
  name text not null,
  quantity numeric(8,2),
  unit text,
  calories numeric(8,2),
  protein_g numeric(8,2),
  carbohydrates_g numeric(8,2),
  fat_g numeric(8,2),
  position smallint not null default 0
);

create table public.cardio_plans (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  title text not null,
  modality text not null,
  duration_minutes smallint not null check (duration_minutes between 1 and 600),
  sessions_per_week smallint not null check (sessions_per_week between 1 and 14),
  intensity text not null,
  intensity_detail text,
  notes text,
  status public.plan_status not null default 'published',
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cardio_logs (
  id uuid primary key default gen_random_uuid(),
  cardio_plan_id uuid not null references public.cardio_plans(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  duration_minutes smallint not null check (duration_minutes between 1 and 600),
  perceived_exertion smallint check (perceived_exertion between 1 and 10),
  note text
);

create table public.habit_goals (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  kind text not null check (kind in ('water', 'steps', 'sleep', 'cardio', 'supplement', 'custom')),
  title text not null,
  target_value numeric(10,2),
  unit text,
  instructions text,
  active boolean not null default true,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_goal_id uuid not null references public.habit_goals(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  logged_for date not null default current_date,
  value numeric(10,2),
  completed boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_goal_id, student_id, logged_for)
);

create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.checkin_feedback_entries (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  meal_reminders boolean not null default true,
  workout_reminders boolean not null default true,
  cardio_reminders boolean not null default true,
  water_reminders boolean not null default true,
  checkin_reminders boolean not null default true,
  plan_update_notifications boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now()
);

create index subscription_payments_due_idx on public.subscription_payments(status, due_date);
create index subscriptions_professional_idx on public.student_subscriptions(professional_id, status);
create index templates_professional_idx on public.plan_templates(professional_id, kind, updated_at desc);
create index cardio_plans_student_idx on public.cardio_plans(student_id, status);
create index cardio_logs_student_idx on public.cardio_logs(student_id, completed_at desc);
create index habit_goals_student_idx on public.habit_goals(student_id, active, position);
create index habit_logs_student_day_idx on public.habit_logs(student_id, logged_for desc);
create index student_notes_student_idx on public.student_notes(student_id, created_at desc);
create index checkin_feedback_checkin_idx on public.checkin_feedback_entries(check_in_id, created_at);

create trigger student_subscriptions_updated_at before update on public.student_subscriptions
for each row execute function public.set_updated_at();
create trigger subscription_payments_updated_at before update on public.subscription_payments
for each row execute function public.set_updated_at();
create trigger plan_templates_updated_at before update on public.plan_templates
for each row execute function public.set_updated_at();
create trigger cardio_plans_updated_at before update on public.cardio_plans
for each row execute function public.set_updated_at();
create trigger notification_preferences_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.student_subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.plan_templates enable row level security;
alter table public.meal_item_substitutions enable row level security;
alter table public.cardio_plans enable row level security;
alter table public.cardio_logs enable row level security;
alter table public.habit_goals enable row level security;
alter table public.habit_logs enable row level security;
alter table public.student_notes enable row level security;
alter table public.checkin_feedback_entries enable row level security;
alter table public.notification_preferences enable row level security;

create policy "subscriptions participants read" on public.student_subscriptions for select to authenticated
using (professional_id = (select auth.uid()) or student_id = (select auth.uid()));
create policy "subscriptions professional inserts" on public.student_subscriptions for insert to authenticated
with check (professional_id = (select auth.uid()));
create policy "subscriptions professional updates" on public.student_subscriptions for update to authenticated
using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "subscriptions professional deletes" on public.student_subscriptions for delete to authenticated
using (professional_id = (select auth.uid()));

create policy "payments participants read" on public.subscription_payments for select to authenticated
using (exists (select 1 from public.student_subscriptions s where s.id = subscription_payments.subscription_id and (s.professional_id = (select auth.uid()) or s.student_id = (select auth.uid()))));
create policy "payments professional inserts" on public.subscription_payments for insert to authenticated
with check (exists (select 1 from public.student_subscriptions s where s.id = subscription_payments.subscription_id and s.professional_id = (select auth.uid())));
create policy "payments professional updates" on public.subscription_payments for update to authenticated
using (exists (select 1 from public.student_subscriptions s where s.id = subscription_payments.subscription_id and s.professional_id = (select auth.uid())))
with check (exists (select 1 from public.student_subscriptions s where s.id = subscription_payments.subscription_id and s.professional_id = (select auth.uid())));
create policy "payments professional deletes" on public.subscription_payments for delete to authenticated
using (exists (select 1 from public.student_subscriptions s where s.id = subscription_payments.subscription_id and s.professional_id = (select auth.uid())));

create policy "templates professional reads" on public.plan_templates for select to authenticated using (professional_id = (select auth.uid()));
create policy "templates professional inserts" on public.plan_templates for insert to authenticated with check (professional_id = (select auth.uid()));
create policy "templates professional updates" on public.plan_templates for update to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "templates professional deletes" on public.plan_templates for delete to authenticated using (professional_id = (select auth.uid()));

create policy "substitutions participants read" on public.meal_item_substitutions for select to authenticated
using (exists (select 1 from public.meal_items mi join public.meals m on m.id = mi.meal_id join public.diet_plans dp on dp.id = m.diet_plan_id where mi.id = meal_item_substitutions.meal_item_id and (dp.student_id = (select auth.uid()) or dp.professional_id = (select auth.uid()))));
create policy "substitutions professional inserts" on public.meal_item_substitutions for insert to authenticated
with check (exists (select 1 from public.meal_items mi join public.meals m on m.id = mi.meal_id join public.diet_plans dp on dp.id = m.diet_plan_id where mi.id = meal_item_substitutions.meal_item_id and dp.professional_id = (select auth.uid())));
create policy "substitutions professional updates" on public.meal_item_substitutions for update to authenticated
using (exists (select 1 from public.meal_items mi join public.meals m on m.id = mi.meal_id join public.diet_plans dp on dp.id = m.diet_plan_id where mi.id = meal_item_substitutions.meal_item_id and dp.professional_id = (select auth.uid())))
with check (exists (select 1 from public.meal_items mi join public.meals m on m.id = mi.meal_id join public.diet_plans dp on dp.id = m.diet_plan_id where mi.id = meal_item_substitutions.meal_item_id and dp.professional_id = (select auth.uid())));
create policy "substitutions professional deletes" on public.meal_item_substitutions for delete to authenticated
using (exists (select 1 from public.meal_items mi join public.meals m on m.id = mi.meal_id join public.diet_plans dp on dp.id = m.diet_plan_id where mi.id = meal_item_substitutions.meal_item_id and dp.professional_id = (select auth.uid())));

create policy "cardio plans participants read" on public.cardio_plans for select to authenticated using (professional_id = (select auth.uid()) or student_id = (select auth.uid()));
create policy "cardio plans professional inserts" on public.cardio_plans for insert to authenticated with check (professional_id = (select auth.uid()));
create policy "cardio plans professional updates" on public.cardio_plans for update to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "cardio plans professional deletes" on public.cardio_plans for delete to authenticated using (professional_id = (select auth.uid()));
create policy "cardio logs participants read" on public.cardio_logs for select to authenticated
using (student_id = (select auth.uid()) or exists (select 1 from public.cardio_plans cp where cp.id = cardio_logs.cardio_plan_id and cp.professional_id = (select auth.uid())));
create policy "cardio logs student inserts" on public.cardio_logs for insert to authenticated with check (student_id = (select auth.uid()));
create policy "cardio logs student updates" on public.cardio_logs for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "cardio logs student deletes" on public.cardio_logs for delete to authenticated using (student_id = (select auth.uid()));

create policy "habit goals participants read" on public.habit_goals for select to authenticated using (professional_id = (select auth.uid()) or student_id = (select auth.uid()));
create policy "habit goals professional inserts" on public.habit_goals for insert to authenticated with check (professional_id = (select auth.uid()));
create policy "habit goals professional updates" on public.habit_goals for update to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "habit goals professional deletes" on public.habit_goals for delete to authenticated using (professional_id = (select auth.uid()));
create policy "habit logs participants read" on public.habit_logs for select to authenticated
using (student_id = (select auth.uid()) or exists (select 1 from public.habit_goals hg where hg.id = habit_logs.habit_goal_id and hg.professional_id = (select auth.uid())));
create policy "habit logs student inserts" on public.habit_logs for insert to authenticated with check (student_id = (select auth.uid()));
create policy "habit logs student updates" on public.habit_logs for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "habit logs student deletes" on public.habit_logs for delete to authenticated using (student_id = (select auth.uid()));

create policy "student notes professional reads" on public.student_notes for select to authenticated using (professional_id = (select auth.uid()));
create policy "student notes student reads shared" on public.student_notes for select to authenticated using (student_id = (select auth.uid()) and not is_private);
create policy "student notes professional inserts" on public.student_notes for insert to authenticated with check (professional_id = (select auth.uid()));
create policy "student notes professional updates" on public.student_notes for update to authenticated using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));
create policy "student notes professional deletes" on public.student_notes for delete to authenticated using (professional_id = (select auth.uid()));

create policy "checkin feedback participants read" on public.checkin_feedback_entries for select to authenticated
using (exists (select 1 from public.check_ins ci where ci.id = checkin_feedback_entries.check_in_id and (ci.student_id = (select auth.uid()) or ci.professional_id = (select auth.uid()))));
create policy "checkin feedback participants insert" on public.checkin_feedback_entries for insert to authenticated
with check (author_id = (select auth.uid()) and exists (select 1 from public.check_ins ci where ci.id = checkin_feedback_entries.check_in_id and (ci.student_id = (select auth.uid()) or ci.professional_id = (select auth.uid()))));

create policy "notification preferences own reads" on public.notification_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy "notification preferences own inserts" on public.notification_preferences for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notification preferences own updates" on public.notification_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.student_subscriptions, public.subscription_payments,
  public.plan_templates, public.meal_item_substitutions, public.cardio_plans, public.cardio_logs,
  public.habit_goals, public.habit_logs, public.student_notes, public.checkin_feedback_entries,
  public.notification_preferences to authenticated;

-- Synchronize access after a payment status change. The application also checks
-- student_profiles.access_status before rendering protected student screens.
create or replace function public.sync_student_access_from_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_student uuid;
  should_suspend boolean;
begin
  select s.student_id,
    exists (
      select 1 from public.subscription_payments p
      where p.subscription_id = s.id
        and p.status in ('pending', 'overdue')
        and p.due_date + s.grace_days < current_date
        and s.auto_suspend
        and s.status = 'active'
    )
  into linked_student, should_suspend
  from public.student_subscriptions s
  where s.id = new.subscription_id;

  if linked_student is not null then
    update public.student_profiles
    set access_status = case when should_suspend then 'suspended' else 'active' end,
        suspension_reason = case when should_suspend then 'Mensalidade pendente' else null end
    where id = linked_student;
  end if;
  return new;
end;
$$;

create trigger payments_sync_student_access
after insert or update of status, paid_at, due_date on public.subscription_payments
for each row execute function public.sync_student_access_from_payment();

revoke all on function public.sync_student_access_from_payment() from public, anon, authenticated;
