-- Operational foundation: granular workout logs, secure in-app notifications
-- and media metadata that can point to Cloudflare Stream or a direct video URL.
create type public.media_provider as enum ('cloudflare_stream', 'external_url');
create type public.notification_kind as enum ('message', 'checkin', 'workout', 'diet', 'system');

create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  provider public.media_provider not null default 'external_url',
  provider_uid text,
  playback_url text,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  check (
    (provider = 'cloudflare_stream' and provider_uid is not null)
    or (provider = 'external_url' and playback_url is not null)
  )
);

create table public.workout_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  completed_at timestamptz not null default now(),
  load_value text,
  notes text,
  unique (student_id, workout_exercise_id, completed_at)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind public.notification_kind not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workout_exercises
  add column media_id uuid references public.exercise_media(id) on delete set null;

alter table public.exercise_media enable row level security;
alter table public.workout_exercise_logs enable row level security;
alter table public.notifications enable row level security;

create index exercise_media_owner_idx on public.exercise_media(owner_id, created_at desc);
create index workout_exercise_logs_student_idx on public.workout_exercise_logs(student_id, completed_at desc);
create index notifications_recipient_idx on public.notifications(recipient_id, read_at, created_at desc);

create policy "exercise media owner manages" on public.exercise_media for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "exercise media linked students read" on public.exercise_media for select to authenticated
using (exists (
  select 1 from public.workout_exercises we
  join public.workout_plans wp on wp.id = we.workout_plan_id
  where we.media_id = exercise_media.id
    and wp.student_id = (select auth.uid())
));

create policy "exercise logs student manages" on public.workout_exercise_logs for all to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy "exercise logs professional reads" on public.workout_exercise_logs for select to authenticated
using (exists (
  select 1 from public.professional_students ps
  where ps.professional_id = (select auth.uid()) and ps.student_id = workout_exercise_logs.student_id
));

create policy "notifications recipient reads" on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

create policy "notifications recipient updates" on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.exercise_media, public.workout_exercise_logs, public.notifications to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
