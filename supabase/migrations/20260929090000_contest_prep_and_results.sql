-- Contest prep (countdown, checklist, posing practice, coach notes) and
-- competitive history with a yearly ranking.

create table public.contest_preps (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null check (length(trim(title)) between 3 and 120),
  stage_date date not null,
  category text check (category is null or length(category) <= 60),
  target_weight_kg numeric(5,2) check (target_weight_kg is null or target_weight_kg between 30 and 250),
  coach_notes text check (coach_notes is null or length(coach_notes) <= 2000),
  status text not null default 'active' check (status in ('active', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contest_preps_student_idx on public.contest_preps(student_id, status);
create index contest_preps_event_idx on public.contest_preps(event_id);
create trigger contest_preps_updated_at before update on public.contest_preps for each row execute function public.set_updated_at();

create table public.prep_checklist_items (
  id uuid primary key default gen_random_uuid(),
  prep_id uuid not null references public.contest_preps(id) on delete cascade,
  label text not null check (length(trim(label)) between 2 and 120),
  done boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index prep_checklist_items_prep_idx on public.prep_checklist_items(prep_id, position);

create table public.prep_pose_logs (
  prep_id uuid not null references public.contest_preps(id) on delete cascade,
  practiced_on date not null,
  poses text[] not null default '{}',
  primary key (prep_id, practiced_on)
);

create table public.competition_results (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  event_name text not null check (length(trim(event_name)) between 3 and 120),
  federation_code text not null references public.federations(code),
  competed_on date not null,
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  category text not null check (length(trim(category)) between 2 and 60),
  placement smallint check (placement is null or placement between 1 and 99),
  is_overall boolean not null default false,
  notes text check (notes is null or length(notes) <= 300),
  created_at timestamptz not null default now()
);
create index competition_results_athlete_idx on public.competition_results(athlete_id, competed_on desc);
create index competition_results_ranking_idx on public.competition_results(competed_on, federation_code, state);
create index competition_results_event_idx on public.competition_results(event_id);

alter table public.contest_preps enable row level security;
alter table public.prep_checklist_items enable row level security;
alter table public.prep_pose_logs enable row level security;
alter table public.competition_results enable row level security;

-- The student owns the prep; the linked coach can follow it and write notes.
create or replace function public.can_access_prep(target_prep uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contest_preps p
    where p.id = target_prep
      and (
        p.student_id = (select auth.uid())
        or exists (
          select 1 from public.professional_students ps
          where ps.student_id = p.student_id and ps.professional_id = (select auth.uid()) and ps.status = 'active'
        )
      )
  );
$$;
revoke all on function public.can_access_prep(uuid) from public, anon;
grant execute on function public.can_access_prep(uuid) to authenticated;

-- The prep table checks its own columns (a lookup by id would not see a row
-- being inserted); child tables go through can_access_prep().
create policy "contest preps participants read" on public.contest_preps for select to authenticated using (
  student_id = (select auth.uid())
  or exists (select 1 from public.professional_students ps where ps.student_id = contest_preps.student_id and ps.professional_id = (select auth.uid()) and ps.status = 'active')
);
create policy "contest preps student inserts" on public.contest_preps for insert to authenticated with check (student_id = (select auth.uid()));
create policy "contest preps participants update" on public.contest_preps for update to authenticated using (
  student_id = (select auth.uid())
  or exists (select 1 from public.professional_students ps where ps.student_id = contest_preps.student_id and ps.professional_id = (select auth.uid()) and ps.status = 'active')
);
create policy "contest preps student deletes" on public.contest_preps for delete to authenticated using (student_id = (select auth.uid()));

create policy "prep checklist participants read" on public.prep_checklist_items for select to authenticated using (public.can_access_prep(prep_id));
create policy "prep checklist participants insert" on public.prep_checklist_items for insert to authenticated with check (public.can_access_prep(prep_id));
create policy "prep checklist participants update" on public.prep_checklist_items for update to authenticated using (public.can_access_prep(prep_id)) with check (public.can_access_prep(prep_id));
create policy "prep checklist participants delete" on public.prep_checklist_items for delete to authenticated using (public.can_access_prep(prep_id));

create policy "prep poses participants read" on public.prep_pose_logs for select to authenticated using (public.can_access_prep(prep_id));
create policy "prep poses student writes" on public.prep_pose_logs for insert to authenticated with check (
  exists (select 1 from public.contest_preps p where p.id = prep_id and p.student_id = (select auth.uid()))
);
create policy "prep poses student updates" on public.prep_pose_logs for update to authenticated using (
  exists (select 1 from public.contest_preps p where p.id = prep_id and p.student_id = (select auth.uid()))
);
create policy "prep poses student deletes" on public.prep_pose_logs for delete to authenticated using (
  exists (select 1 from public.contest_preps p where p.id = prep_id and p.student_id = (select auth.uid()))
);

-- Results are public inside the app (profiles and ranking).
create policy "competition results authenticated read" on public.competition_results for select to authenticated using (true);
create policy "competition results self inserts" on public.competition_results for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy "competition results self updates" on public.competition_results for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create policy "competition results self deletes" on public.competition_results for delete to authenticated using (athlete_id = (select auth.uid()));

-- Points: 1st 10, 2nd 7, 3rd 5, 4th-5th 3, other placements or participation 1,
-- overall title +5.
create or replace function public.competition_ranking(target_year integer, target_federation text default null, target_state text default null)
returns table (athlete_id uuid, points integer, podiums integer, titles integer, competitions integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.athlete_id,
    sum(
      case when r.placement = 1 then 10 when r.placement = 2 then 7 when r.placement = 3 then 5 when r.placement in (4, 5) then 3 else 1 end
      + case when r.is_overall then 5 else 0 end
    )::integer as points,
    count(*) filter (where r.placement between 1 and 3)::integer as podiums,
    count(*) filter (where r.placement = 1)::integer as titles,
    count(*)::integer as competitions
  from public.competition_results r
  where extract(year from r.competed_on) = target_year
    and (target_federation is null or r.federation_code = target_federation)
    and (target_state is null or r.state = target_state)
  group by r.athlete_id
  order by points desc, titles desc, podiums desc
  limit 100;
$$;
revoke all on function public.competition_ranking(integer, text, text) from public, anon;
grant execute on function public.competition_ranking(integer, text, text) to authenticated;
