-- Bodybuilding events: calendar by federation, attendance ("vou competir" /
-- "vou assistir"), lodging tips, rides (connect people only) and anonymous
-- athlete feedback about each event.

create table public.federations (
  code text primary key,
  name text not null,
  natural_only boolean not null default false,
  position smallint not null default 0
);
alter table public.federations enable row level security;
create policy "federations authenticated read" on public.federations for select to authenticated using (true);

insert into public.federations (code, name, natural_only, position) values
  ('ifbb_pro',     'IFBB Pro League',        false, 1),
  ('ifbb_brasil',  'IFBB Brasil',            false, 2),
  ('npc',          'NPC Worldwide Brasil',   false, 3),
  ('musclecontest','Musclecontest Brasil',   false, 4),
  ('wnbf',         'WNBF Brasil',            true,  5),
  ('natural',      'Natural (outras ligas)', true,  6),
  ('outra',        'Outra',                  false, 99);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.professional_profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 120),
  kind text not null default 'campeonato' check (kind in ('campeonato', 'seletiva', 'workshop', 'encontro', 'outro')),
  federation_code text not null references public.federations(code),
  federation_other text check (federation_other is null or length(federation_other) <= 80),
  starts_on date not null,
  ends_on date,
  city text not null check (length(trim(city)) between 2 and 80),
  state text not null check (state ~ '^[A-Z]{2}$'),
  venue text check (venue is null or length(venue) <= 120),
  address text check (address is null or length(address) <= 200),
  registration_url text check (registration_url is null or registration_url ~ '^https?://'),
  description text check (description is null or length(description) <= 2000),
  categories text[] not null default '{}',
  cover_path text,
  status text not null default 'published' check (status in ('published', 'cancelled')),
  audience_invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index events_starts_idx on public.events(starts_on);
create index events_state_idx on public.events(state, starts_on);
create index events_created_by_idx on public.events(created_by);
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();

create table public.event_attendance (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('atleta', 'torcida', 'treinador')),
  category text check (category is null or length(category) <= 60),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_attendance_user_idx on public.event_attendance(user_id);

create table public.event_tips (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'hospedagem' check (kind in ('hospedagem', 'alimentacao', 'geral')),
  body text not null check (length(trim(body)) between 3 and 500),
  url text check (url is null or url ~ '^https?://'),
  created_at timestamptz not null default now()
);
create index event_tips_event_idx on public.event_tips(event_id, created_at);
create index event_tips_author_idx on public.event_tips(author_id);

-- Rides only connect people: fuel is split between them, no payment in the app.
create table public.event_rides (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('oferta', 'pedido')),
  from_city text not null check (length(trim(from_city)) between 2 and 80),
  departure_date date,
  seats smallint check (seats is null or seats between 1 and 8),
  contact text check (contact is null or length(contact) <= 80),
  note text check (note is null or length(note) <= 300),
  created_at timestamptz not null default now()
);
create index event_rides_event_idx on public.event_rides(event_id, created_at);
create index event_rides_author_idx on public.event_rides(author_id);

-- Anonymous feedback: authors are never exposed; only aggregates and comment
-- text are readable, through event_feedback_summary().
create table public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  organization smallint not null check (organization between 1 and 5),
  judging smallint not null check (judging between 1 and 5),
  structure smallint not null check (structure between 1 and 5),
  punctuality smallint not null check (punctuality between 1 and 5),
  comment text check (comment is null or length(comment) <= 1000),
  accepted_terms boolean not null check (accepted_terms),
  created_at timestamptz not null default now(),
  unique (event_id, author_id)
);
create index event_feedback_author_idx on public.event_feedback(author_id);

alter table public.events enable row level security;
alter table public.event_attendance enable row level security;
alter table public.event_tips enable row level security;
alter table public.event_rides enable row level security;
alter table public.event_feedback enable row level security;

create policy "events authenticated read" on public.events for select to authenticated using (true);
create policy "events professionals create" on public.events for insert to authenticated with check (created_by = (select auth.uid()));
create policy "events creator updates" on public.events for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "events creator deletes" on public.events for delete to authenticated using (created_by = (select auth.uid()));

create policy "event attendance authenticated read" on public.event_attendance for select to authenticated using (true);
create policy "event attendance self inserts" on public.event_attendance for insert to authenticated with check (user_id = (select auth.uid()));
create policy "event attendance self updates" on public.event_attendance for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "event attendance self deletes" on public.event_attendance for delete to authenticated using (user_id = (select auth.uid()));

create policy "event tips authenticated read" on public.event_tips for select to authenticated using (true);
create policy "event tips self inserts" on public.event_tips for insert to authenticated with check (author_id = (select auth.uid()));
create policy "event tips author or creator deletes" on public.event_tips for delete to authenticated using (
  author_id = (select auth.uid()) or exists (select 1 from public.events e where e.id = event_tips.event_id and e.created_by = (select auth.uid()))
);

create policy "event rides authenticated read" on public.event_rides for select to authenticated using (true);
create policy "event rides self inserts" on public.event_rides for insert to authenticated with check (author_id = (select auth.uid()));
create policy "event rides self deletes" on public.event_rides for delete to authenticated using (author_id = (select auth.uid()));

create policy "event feedback own read" on public.event_feedback for select to authenticated using (author_id = (select auth.uid()));
create policy "event feedback self inserts" on public.event_feedback for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.events e where e.id = event_feedback.event_id and e.starts_on <= (now() at time zone 'America/Sao_Paulo')::date)
);
create policy "event feedback self deletes" on public.event_feedback for delete to authenticated using (author_id = (select auth.uid()));

create or replace function public.event_feedback_summary(target_event uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'count', count(*),
    'organization', round(avg(organization), 1),
    'judging', round(avg(judging), 1),
    'structure', round(avg(structure), 1),
    'punctuality', round(avg(punctuality), 1),
    'comments', coalesce(
      (select jsonb_agg(jsonb_build_object('comment', f.comment, 'created_at', date_trunc('day', f.created_at)) order by f.created_at desc)
       from public.event_feedback f where f.event_id = target_event and f.comment is not null and length(trim(f.comment)) > 0),
      '[]'::jsonb)
  )
  from public.event_feedback where event_id = target_event;
$$;
revoke all on function public.event_feedback_summary(uuid) from public, anon;
grant execute on function public.event_feedback_summary(uuid) to authenticated;

-- "Chamar os fãs": notifies the creator's active students and followers, once.
create or replace function public.invite_event_audience(target_event uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.events;
  sent integer;
begin
  select * into event_row from public.events where id = target_event;
  if event_row.id is null or event_row.created_by <> (select auth.uid()) then
    raise exception 'Not allowed';
  end if;
  if event_row.audience_invited_at is not null then
    return 0;
  end if;

  insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
  select distinct recipient, event_row.created_by, 'system'::public.notification_kind, 'Novo evento: ' || event_row.title,
    to_char(event_row.starts_on, 'DD/MM/YYYY') || ' · ' || event_row.city || '/' || event_row.state,
    '/eventos/' || event_row.id
  from (
    select student_id as recipient from public.professional_students where professional_id = event_row.created_by and status = 'active'
    union
    select follower_id from public.social_follows where followee_id = event_row.created_by
  ) audience
  where recipient <> event_row.created_by;
  get diagnostics sent = row_count;

  update public.events set audience_invited_at = now() where id = target_event;
  return sent;
end;
$$;
revoke all on function public.invite_event_audience(uuid) from public, anon;
grant execute on function public.invite_event_audience(uuid) to authenticated;

-- Event covers are public images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-covers', 'event-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "event covers owner uploads" on storage.objects
for insert to authenticated with check (bucket_id = 'event-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "event covers owner updates" on storage.objects
for update to authenticated using (bucket_id = 'event-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "event covers owner deletes" on storage.objects
for delete to authenticated using (bucket_id = 'event-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
