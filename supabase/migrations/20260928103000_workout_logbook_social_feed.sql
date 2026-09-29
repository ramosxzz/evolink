-- Evolink logbook 2.0 and first private-by-default community feed.

alter table public.workout_logs
  add column status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  add column started_at timestamptz not null default now(),
  add column total_volume_kg numeric(12,2) not null default 0 check (total_volume_kg >= 0),
  add column total_sets integer not null default 0 check (total_sets >= 0),
  add column pr_count integer not null default 0 check (pr_count >= 0);

update public.workout_logs
set status = 'completed', started_at = created_at
where completed_at is not null;

-- Rows created before sessions existed cannot be resumed safely.
update public.workout_logs
set status = 'abandoned', started_at = created_at
where completed_at is null;

alter table public.workout_exercise_logs
  add column workout_log_id uuid references public.workout_logs(id) on delete cascade,
  add column load_kg numeric(8,2) check (load_kg is null or load_kg >= 0),
  add column set_type text not null default 'working'
    check (set_type in ('warmup', 'working', 'drop', 'failure')),
  add column is_personal_record boolean not null default false,
  add constraint workout_exercise_logs_session_set_unique
    unique (workout_log_id, workout_exercise_id, set_number);

create index workout_logs_student_status_idx
  on public.workout_logs(student_id, status, started_at desc);
create unique index workout_logs_one_active_session_idx
  on public.workout_logs(student_id, workout_plan_id)
  where status = 'in_progress';
create index workout_logs_plan_idx
  on public.workout_logs(workout_plan_id);
create index workout_exercise_logs_session_idx
  on public.workout_exercise_logs(workout_log_id, workout_exercise_id, set_number);
create index workout_exercise_logs_exercise_idx
  on public.workout_exercise_logs(workout_exercise_id);

create table public.social_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 2 and 80),
  bio text check (bio is null or length(bio) <= 240),
  avatar_path text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.social_profiles(id) on delete cascade,
  workout_log_id uuid unique references public.workout_logs(id) on delete cascade,
  kind text not null default 'workout' check (kind in ('workout')),
  visibility text not null default 'coach' check (visibility in ('coach', 'community')),
  caption text check (caption is null or length(caption) <= 500),
  workout_title text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  total_volume_kg numeric(12,2) not null default 0 check (total_volume_kg >= 0),
  total_sets integer not null default 0 check (total_sets >= 0),
  pr_count integer not null default 0 check (pr_count >= 0),
  exercise_summary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index social_posts_author_created_idx
  on public.social_posts(author_id, created_at desc);
create index social_posts_visibility_created_idx
  on public.social_posts(visibility, created_at desc);
create index social_post_likes_user_idx
  on public.social_post_likes(user_id, created_at desc);

create trigger social_profiles_updated_at before update on public.social_profiles
for each row execute function public.set_updated_at();
create trigger social_posts_updated_at before update on public.social_posts
for each row execute function public.set_updated_at();

alter table public.social_profiles enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_post_likes enable row level security;

create policy "workout logs student reads" on public.workout_logs
for select to authenticated using (student_id = (select auth.uid()));

create policy "social profiles authenticated read" on public.social_profiles
for select to authenticated using (is_public or id = (select auth.uid()));
create policy "social profiles self insert" on public.social_profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy "social profiles self update" on public.social_profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));
create policy "social profiles self delete" on public.social_profiles
for delete to authenticated using (id = (select auth.uid()));

create policy "social posts audience reads" on public.social_posts
for select to authenticated using (
  author_id = (select auth.uid())
  or visibility = 'community'
  or (
    visibility = 'coach'
    and exists (
      select 1 from public.professional_students ps
      where ps.professional_id = (select auth.uid())
        and ps.student_id = social_posts.author_id
        and ps.status = 'active'
    )
  )
);
create policy "social posts author inserts" on public.social_posts
for insert to authenticated with check (
  author_id = (select auth.uid())
  and (
    workout_log_id is null
    or exists (
      select 1 from public.workout_logs wl
      where wl.id = social_posts.workout_log_id
        and wl.student_id = (select auth.uid())
        and wl.status = 'completed'
    )
  )
);
create policy "social posts author updates" on public.social_posts
for update to authenticated using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));
create policy "social posts author deletes" on public.social_posts
for delete to authenticated using (author_id = (select auth.uid()));

create policy "social likes audience reads" on public.social_post_likes
for select to authenticated using (
  exists (
    select 1 from public.social_posts sp
    where sp.id = social_post_likes.post_id
      and (
        sp.author_id = (select auth.uid())
        or sp.visibility = 'community'
        or exists (
          select 1 from public.professional_students ps
          where ps.professional_id = (select auth.uid())
            and ps.student_id = sp.author_id
            and ps.status = 'active'
        )
      )
  )
);
create policy "social likes self inserts" on public.social_post_likes
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.social_posts sp
    where sp.id = social_post_likes.post_id
      and (
        sp.author_id = (select auth.uid())
        or sp.visibility = 'community'
        or exists (
          select 1 from public.professional_students ps
          where ps.professional_id = (select auth.uid())
            and ps.student_id = sp.author_id
            and ps.status = 'active'
        )
      )
  )
);
create policy "social likes self deletes" on public.social_post_likes
for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.social_profiles, public.social_posts, public.social_post_likes from anon, authenticated;
revoke all on public.workout_logs, public.workout_exercise_logs from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.social_profiles to authenticated;
grant select, insert, update, delete on public.social_posts to authenticated;
grant select, insert, delete on public.social_post_likes to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.workout_exercise_logs to authenticated;
