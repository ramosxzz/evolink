-- Evolink social network (text/photo posts, follows, comments, avatars) and
-- rewards (achievements computed from real activity, unlockable frames).

-- Every user gets a social profile ----------------------------------------------
alter table public.social_profiles
  add column frame text not null default 'none',
  add column avatar_updated_at timestamptz;

insert into public.social_profiles (id, display_name)
select id, case when length(trim(full_name)) >= 2 then left(trim(full_name), 80) else 'Atleta Evolink' end
from public.profiles
on conflict (id) do nothing;

create or replace function public.create_social_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.social_profiles (id, display_name)
  values (new.id, case when length(trim(new.full_name)) >= 2 then left(trim(new.full_name), 80) else 'Atleta Evolink' end)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_social_profile() from public, anon, authenticated;

create trigger profiles_create_social_profile after insert on public.profiles
for each row execute function public.create_social_profile();

-- Posts: text, photos and achievements, plus a followers-only audience ---------
alter table public.social_posts
  alter column workout_title drop not null,
  drop constraint social_posts_kind_check,
  add constraint social_posts_kind_check check (kind in ('workout', 'text', 'photo', 'cardio', 'achievement')),
  drop constraint social_posts_visibility_check,
  add constraint social_posts_visibility_check check (visibility in ('coach', 'followers', 'community')),
  add column image_paths text[] not null default '{}' check (cardinality(image_paths) <= 4),
  add column achievement_code text,
  add constraint social_posts_has_content check (
    kind <> 'text' or length(trim(coalesce(caption, ''))) > 0
  );

create table public.social_follows (
  follower_id uuid not null references public.social_profiles(id) on delete cascade,
  followee_id uuid not null references public.social_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index social_follows_followee_idx on public.social_follows(followee_id);

create table public.social_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  author_id uuid not null references public.social_profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index social_comments_post_idx on public.social_comments(post_id, created_at);
create index social_comments_author_idx on public.social_comments(author_id);

alter table public.social_follows enable row level security;
alter table public.social_comments enable row level security;

-- One place that decides who can see a post; used by posts, likes, comments
-- and post images in storage.
create or replace function public.can_view_post(post_author uuid, post_visibility text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    post_author = (select auth.uid())
    or post_visibility = 'community'
    or (
      post_visibility = 'followers'
      and exists (select 1 from public.social_follows f where f.follower_id = (select auth.uid()) and f.followee_id = post_author)
    )
    or exists (
      select 1 from public.professional_students ps
      where ps.professional_id = (select auth.uid()) and ps.student_id = post_author and ps.status = 'active'
    );
$$;
revoke all on function public.can_view_post(uuid, text) from public, anon;
grant execute on function public.can_view_post(uuid, text) to authenticated;

drop policy "social posts audience reads" on public.social_posts;
create policy "social posts audience reads" on public.social_posts
for select to authenticated using (public.can_view_post(author_id, visibility));

drop policy "social posts author inserts" on public.social_posts;
create policy "social posts author inserts" on public.social_posts
for insert to authenticated with check (
  author_id = (select auth.uid())
  and (
    workout_log_id is null
    or exists (
      select 1 from public.workout_logs wl
      where wl.id = social_posts.workout_log_id and wl.student_id = (select auth.uid()) and wl.status = 'completed'
    )
  )
  and not exists (select 1 from unnest(image_paths) path where path not like (select auth.uid())::text || '/%')
);

drop policy "social likes audience reads" on public.social_post_likes;
create policy "social likes audience reads" on public.social_post_likes
for select to authenticated using (
  exists (select 1 from public.social_posts sp where sp.id = social_post_likes.post_id)
);

drop policy "social likes self inserts" on public.social_post_likes;
create policy "social likes self inserts" on public.social_post_likes
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.social_posts sp where sp.id = social_post_likes.post_id)
);

create policy "social follows authenticated read" on public.social_follows
for select to authenticated using (true);
create policy "social follows self inserts" on public.social_follows
for insert to authenticated with check (
  follower_id = (select auth.uid())
  and exists (select 1 from public.social_profiles p where p.id = followee_id and p.is_public)
);
create policy "social follows self deletes" on public.social_follows
for delete to authenticated using (follower_id = (select auth.uid()));

create policy "social comments audience reads" on public.social_comments
for select to authenticated using (
  exists (select 1 from public.social_posts sp where sp.id = social_comments.post_id)
);
create policy "social comments self inserts" on public.social_comments
for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.social_posts sp where sp.id = social_comments.post_id)
);
create policy "social comments author or post owner deletes" on public.social_comments
for delete to authenticated using (
  author_id = (select auth.uid())
  or exists (select 1 from public.social_posts sp where sp.id = social_comments.post_id and sp.author_id = (select auth.uid()))
);

-- Storage: private post images, public avatars ----------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('social-media', 'social-media', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "social media owner uploads" on storage.objects
for insert to authenticated with check (bucket_id = 'social-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "social media owner deletes" on storage.objects
for delete to authenticated using (bucket_id = 'social-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "social media audience reads" on storage.objects
for select to authenticated using (
  bucket_id = 'social-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.social_posts sp where objects.name = any(sp.image_paths))
  )
);

create policy "avatars owner uploads" on storage.objects
for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars owner updates" on storage.objects
for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars owner deletes" on storage.objects
for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Achievements -------------------------------------------------------------------
create table public.achievements (
  code text primary key,
  category text not null check (category in ('treino', 'cardio', 'consistencia', 'evolucao', 'comunidade')),
  title text not null,
  description text not null,
  icon text not null,
  tier text not null check (tier in ('bronze', 'prata', 'ouro', 'diamante')),
  points integer not null check (points > 0),
  metric text not null,
  threshold numeric not null check (threshold > 0),
  position smallint not null default 0
);

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null references public.achievements(code) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);
create index user_achievements_code_idx on public.user_achievements(code);

create table public.profile_frames (
  code text primary key,
  title text not null,
  required_achievement text references public.achievements(code),
  position smallint not null default 0
);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.profile_frames enable row level security;
create policy "achievements authenticated read" on public.achievements for select to authenticated using (true);
create policy "user achievements authenticated read" on public.user_achievements for select to authenticated using (true);
create policy "profile frames authenticated read" on public.profile_frames for select to authenticated using (true);

insert into public.achievements (code, category, title, description, icon, tier, points, metric, threshold, position) values
  ('first_workout',   'treino',       'Primeiro treino',        'Concluiu o primeiro treino no logbook.',       'dumbbell', 'bronze',   10, 'workouts_completed', 1, 1),
  ('workouts_10',     'treino',       'Pegando ritmo',          '10 treinos concluídos.',                       'dumbbell', 'prata',    25, 'workouts_completed', 10, 2),
  ('workouts_50',     'treino',       'Rato de academia',       '50 treinos concluídos.',                       'dumbbell', 'ouro',     60, 'workouts_completed', 50, 3),
  ('workouts_100',    'treino',       'Centurião',              '100 treinos concluídos.',                      'crown',    'diamante', 120, 'workouts_completed', 100, 4),
  ('volume_10t',      'treino',       '10 toneladas',           '10.000 kg de volume acumulado.',               'weight',   'bronze',   15, 'volume_kg', 10000, 5),
  ('volume_100t',     'treino',       '100 toneladas',          '100.000 kg de volume acumulado.',              'weight',   'ouro',     60, 'volume_kg', 100000, 6),
  ('first_pr',        'treino',       'Novo recorde',           'Bateu o primeiro recorde pessoal.',            'medal',    'bronze',   10, 'personal_records', 1, 7),
  ('prs_25',          'treino',       'Máquina de PRs',         '25 recordes pessoais.',                        'medal',    'ouro',     60, 'personal_records', 25, 8),
  ('first_run',       'cardio',       'Primeira corrida',       'Registrou a primeira corrida.',                'footprints', 'bronze', 10, 'run_days', 1, 10),
  ('run_days_10',     'cardio',       'Corredor constante',     'Correu em 10 dias diferentes.',                'footprints', 'prata',  25, 'run_days', 10, 11),
  ('run_days_50',     'cardio',       'Estrada é casa',         'Correu em 50 dias diferentes.',                'footprints', 'ouro',   60, 'run_days', 50, 12),
  ('run_5k',          'cardio',       '5K',                     'Uma corrida de pelo menos 5 km.',              'flag',     'bronze',   15, 'longest_run_km', 5, 13),
  ('run_10k',         'cardio',       '10K',                    'Uma corrida de pelo menos 10 km.',             'flag',     'prata',    30, 'longest_run_km', 10, 14),
  ('run_21k',         'cardio',       'Meia maratona',          'Uma corrida de pelo menos 21,1 km.',           'flag',     'ouro',     70, 'longest_run_km', 21.1, 15),
  ('run_42k',         'cardio',       'Maratonista',            'Uma corrida de pelo menos 42,2 km.',           'trophy',   'diamante', 150, 'longest_run_km', 42.2, 16),
  ('run_total_100',   'cardio',       '100 km corridos',        '100 km acumulados em corridas.',               'route',    'ouro',     60, 'run_km_total', 100, 17),
  ('run_total_500',   'cardio',       '500 km corridos',        '500 km acumulados em corridas.',               'route',    'diamante', 150, 'run_km_total', 500, 18),
  ('streak_3',        'consistencia', 'Três em sequência',      '3 dias seguidos treinando ou fazendo cardio.', 'flame',    'bronze',   10, 'best_streak_days', 3, 20),
  ('streak_7',        'consistencia', 'Semana perfeita',        '7 dias seguidos em atividade.',                'flame',    'prata',    30, 'best_streak_days', 7, 21),
  ('streak_30',       'consistencia', 'Imparável',              '30 dias seguidos em atividade.',               'flame',    'diamante', 150, 'best_streak_days', 30, 22),
  ('checkins_4',      'evolucao',     'Um mês de check-ins',    '4 check-ins semanais enviados.',               'clipboard', 'bronze',  15, 'checkins_submitted', 4, 30),
  ('checkins_12',     'evolucao',     'Trimestre comprometido', '12 check-ins semanais enviados.',              'clipboard', 'ouro',    60, 'checkins_submitted', 12, 31),
  ('progress_10',     'evolucao',     'De olho na balança',     '10 registros de evolução.',                    'scale',    'prata',    25, 'progress_records', 10, 32),
  ('first_post',      'comunidade',   'Primeira publicação',    'Publicou na comunidade.',                      'message',  'bronze',   10, 'posts', 1, 40),
  ('likes_50',        'comunidade',   'Inspiração',             'Recebeu 50 curtidas.',                         'heart',    'ouro',     60, 'likes_received', 50, 41);

insert into public.profile_frames (code, title, required_achievement, position) values
  ('none',     'Sem moldura',     null,           0),
  ('bronze',   'Bronze',          'streak_3',     1),
  ('silver',   'Prata',           'workouts_10',  2),
  ('gold',     'Ouro',            'workouts_50',  3),
  ('runner',   'Corredor',        'run_10k',      4),
  ('fire',     'Em chamas',       'streak_7',     5),
  ('diamond',  'Diamante',        'workouts_100', 6),
  ('champion', 'Campeão (brilhante)', 'streak_30', 7);

alter table public.social_profiles
  add constraint social_profiles_frame_fkey foreign key (frame) references public.profile_frames(code);

-- Only frames the user has unlocked can be selected.
create or replace function public.check_profile_frame()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  required text;
begin
  select required_achievement into required from public.profile_frames where code = new.frame;
  if required is not null and not exists (select 1 from public.user_achievements where user_id = new.id and code = required) then
    raise exception 'Moldura ainda não desbloqueada';
  end if;
  return new;
end;
$$;
revoke all on function public.check_profile_frame() from public, anon, authenticated;
create trigger social_profiles_check_frame before insert or update of frame on public.social_profiles
for each row execute function public.check_profile_frame();

-- Metrics used by achievements; also shown as progress on the achievements page.
create or replace function public.achievement_metrics_internal(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with active_days as (
    select distinct (completed_at at time zone 'America/Sao_Paulo')::date as day
    from public.workout_logs where student_id = target and status = 'completed' and completed_at is not null
    union
    select distinct (completed_at at time zone 'America/Sao_Paulo')::date
    from public.cardio_logs where student_id = target
  ),
  islands as (
    select day, day - (row_number() over (order by day))::int as grp from active_days
  ),
  streaks as (
    select grp, count(*) as length, max(day) as last_day from islands group by grp
  ),
  runs as (
    select * from public.cardio_logs
    where student_id = target and coalesce(modality, '') in ('Corrida', 'Esteira') and distance_km is not null
  )
  select jsonb_build_object(
    'workouts_completed', (select count(*) from public.workout_logs where student_id = target and status = 'completed'),
    'volume_kg', (select coalesce(sum(total_volume_kg), 0) from public.workout_logs where student_id = target and status = 'completed'),
    'personal_records', (select count(*) from public.workout_exercise_logs where student_id = target and is_personal_record),
    'run_days', (select count(distinct (completed_at at time zone 'America/Sao_Paulo')::date) from runs),
    'longest_run_km', (select coalesce(max(distance_km), 0) from runs),
    'run_km_total', (select coalesce(sum(distance_km), 0) from runs),
    'best_streak_days', (select coalesce(max(length), 0) from streaks),
    'current_streak_days', (select coalesce(max(length), 0) from streaks where last_day >= (now() at time zone 'America/Sao_Paulo')::date - 1),
    'checkins_submitted', (select count(*) from public.check_ins where student_id = target and status in ('submitted', 'reviewed')),
    'progress_records', (select count(*) from public.progress_records where student_id = target),
    'posts', (select count(*) from public.social_posts where author_id = target),
    'likes_received', (select count(*) from public.social_post_likes l join public.social_posts p on p.id = l.post_id where p.author_id = target and l.user_id <> target)
  );
$$;
revoke all on function public.achievement_metrics_internal(uuid) from public, anon, authenticated;

create or replace function public.achievement_metrics(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is distinct from target then
    raise exception 'Not allowed';
  end if;
  return public.achievement_metrics_internal(target);
end;
$$;
revoke all on function public.achievement_metrics(uuid) from public, anon;
grant execute on function public.achievement_metrics(uuid) to authenticated;

-- Grants newly reached achievements and notifies the user.
create or replace function public.evaluate_achievements_internal(target uuid)
returns setof text
language sql
security definer
set search_path = ''
as $$
  with metrics as (select public.achievement_metrics_internal(target) as m),
  earned as (
    insert into public.user_achievements (user_id, code)
    select target, a.code from public.achievements a, metrics
    where coalesce((metrics.m ->> a.metric)::numeric, 0) >= a.threshold
    on conflict do nothing
    returning code
  ),
  notified as (
    insert into public.notifications (recipient_id, kind, title, body, href)
    select target, 'system', 'Nova conquista: ' || a.title, a.description, '/conquistas'
    from earned join public.achievements a on a.code = earned.code
  )
  select code from earned;
$$;
revoke all on function public.evaluate_achievements_internal(uuid) from public, anon, authenticated;

create or replace function public.evaluate_achievements(target uuid)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is distinct from target then
    raise exception 'Not allowed';
  end if;
  return query select * from public.evaluate_achievements_internal(target);
end;
$$;
revoke all on function public.evaluate_achievements(uuid) from public, anon;
grant execute on function public.evaluate_achievements(uuid) to authenticated;

create or replace function public.evaluate_achievements_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  -- Separate branches: each table has a different owner column.
  if tg_table_name = 'social_posts' then
    target := new.author_id;
  elsif tg_table_name = 'social_post_likes' then
    select author_id into target from public.social_posts where id = new.post_id;
  else
    target := new.student_id;
  end if;
  if target is not null then
    perform public.evaluate_achievements_internal(target);
  end if;
  return new;
end;
$$;
revoke all on function public.evaluate_achievements_trigger() from public, anon, authenticated;

create trigger workout_logs_achievements after update of status on public.workout_logs
for each row when (new.status = 'completed' and old.status is distinct from 'completed')
execute function public.evaluate_achievements_trigger();
create trigger cardio_logs_achievements after insert on public.cardio_logs
for each row execute function public.evaluate_achievements_trigger();
create trigger check_ins_achievements after insert or update of status on public.check_ins
for each row when (new.status in ('submitted', 'reviewed'))
execute function public.evaluate_achievements_trigger();
create trigger progress_records_achievements after insert on public.progress_records
for each row execute function public.evaluate_achievements_trigger();
create trigger social_posts_achievements after insert on public.social_posts
for each row execute function public.evaluate_achievements_trigger();
create trigger social_post_likes_achievements after insert on public.social_post_likes
for each row execute function public.evaluate_achievements_trigger();

-- Backfill achievements for existing activity (no notifications for history).
insert into public.user_achievements (user_id, code)
select p.id, a.code
from public.profiles p
cross join lateral (select public.achievement_metrics_internal(p.id) as m) metrics
join public.achievements a on coalesce((metrics.m ->> a.metric)::numeric, 0) >= a.threshold
on conflict do nothing;
