-- Strava: students connect their account and activities land in cardio_logs
-- automatically (webhook), deduplicated by the Strava activity id.

alter table public.cardio_logs
  add column source text not null default 'manual' check (source in ('manual', 'strava')),
  add column external_id text,
  add column avg_heart_rate smallint check (avg_heart_rate is null or avg_heart_rate between 30 and 250),
  add column elevation_m numeric(7,1);
-- Manual logs have a null external_id, and nulls never conflict.
alter table public.cardio_logs add constraint cardio_logs_external_key unique (source, external_id);

-- Tokens are secrets: no client policies, only the server (service role) reads them.
create table public.strava_connections (
  student_id uuid primary key references public.student_profiles(id) on delete cascade,
  athlete_id bigint not null unique,
  athlete_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz
);
alter table public.strava_connections enable row level security;

create or replace function public.my_strava_connection()
returns table (athlete_name text, connected_at timestamptz, last_sync_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select athlete_name, connected_at, last_sync_at from public.strava_connections where student_id = (select auth.uid());
$$;
revoke all on function public.my_strava_connection() from public, anon;
grant execute on function public.my_strava_connection() to authenticated;
