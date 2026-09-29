-- Coach portfolio (public page with transformations and testimonials) and
-- coach directory with contact requests ("interessados") from students.

create table public.coach_portfolios (
  coach_id uuid primary key references public.professional_profiles(id) on delete cascade,
  headline text check (headline is null or length(headline) <= 120),
  about text check (about is null or length(about) <= 2000),
  specialties text[] not null default '{}' check (cardinality(specialties) <= 8),
  modality text not null default 'online' check (modality in ('online', 'presencial', 'ambos')),
  city text check (city is null or length(city) <= 80),
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  price_from_cents integer check (price_from_cents is null or price_from_cents between 1000 and 10000000),
  years_experience smallint check (years_experience is null or years_experience between 0 and 60),
  instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  accepting_students boolean not null default true,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger coach_portfolios_updated_at before update on public.coach_portfolios for each row execute function public.set_updated_at();
create index coach_portfolios_directory_idx on public.coach_portfolios(published, accepting_students, state);

create table public.portfolio_transformations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.professional_profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 80),
  description text check (description is null or length(description) <= 400),
  duration_weeks smallint check (duration_weeks is null or duration_weeks between 1 and 260),
  before_path text not null,
  after_path text not null,
  -- The coach confirms the student authorized publishing the photos.
  consent_confirmed boolean not null check (consent_confirmed),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index portfolio_transformations_coach_idx on public.portfolio_transformations(coach_id, position);

create table public.portfolio_testimonials (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.professional_profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (length(trim(body)) between 10 and 600),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  unique (coach_id, author_id)
);
create index portfolio_testimonials_coach_idx on public.portfolio_testimonials(coach_id, status);

create table public.coach_leads (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.professional_profiles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text not null default '',
  goal text not null check (length(trim(goal)) between 2 and 80),
  message text check (message is null or length(message) <= 600),
  status text not null default 'new' check (status in ('new', 'invited', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger coach_leads_updated_at before update on public.coach_leads for each row execute function public.set_updated_at();
create unique index coach_leads_one_open_idx on public.coach_leads(coach_id, requester_id) where status = 'new';
create index coach_leads_coach_idx on public.coach_leads(coach_id, status, created_at desc);

alter table public.coach_portfolios enable row level security;
alter table public.portfolio_transformations enable row level security;
alter table public.portfolio_testimonials enable row level security;
alter table public.coach_leads enable row level security;

create or replace function public.portfolio_is_published(target_coach uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.coach_portfolios where coach_id = target_coach and published);
$$;
revoke all on function public.portfolio_is_published(uuid) from public, anon;
grant execute on function public.portfolio_is_published(uuid) to authenticated;

create policy "portfolios published or own" on public.coach_portfolios for select to authenticated
  using (published or coach_id = (select auth.uid()));
create policy "portfolios own insert" on public.coach_portfolios for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy "portfolios own update" on public.coach_portfolios for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

create policy "transformations published or own" on public.portfolio_transformations for select to authenticated
  using (coach_id = (select auth.uid()) or public.portfolio_is_published(coach_id));
create policy "transformations own insert" on public.portfolio_transformations for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy "transformations own update" on public.portfolio_transformations for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy "transformations own delete" on public.portfolio_transformations for delete to authenticated
  using (coach_id = (select auth.uid()));

-- Students (current or former) of the coach write one testimonial; the coach
-- moderates it through set_testimonial_status.
create policy "testimonials visible" on public.portfolio_testimonials for select to authenticated
  using (author_id = (select auth.uid()) or coach_id = (select auth.uid()) or (status = 'published' and public.portfolio_is_published(coach_id)));
create policy "testimonials by students" on public.portfolio_testimonials for insert to authenticated
  with check (
    author_id = (select auth.uid()) and status = 'pending'
    and exists (select 1 from public.professional_students ps where ps.professional_id = coach_id and ps.student_id = (select auth.uid()))
  );
create policy "testimonials author deletes" on public.portfolio_testimonials for delete to authenticated
  using (author_id = (select auth.uid()));

create policy "leads participants read" on public.coach_leads for select to authenticated
  using (requester_id = (select auth.uid()) or coach_id = (select auth.uid()));
create policy "leads students request" on public.coach_leads for insert to authenticated
  with check (
    requester_id = (select auth.uid()) and status = 'new'
    and exists (select 1 from public.student_profiles where id = (select auth.uid()))
    and exists (select 1 from public.coach_portfolios p where p.coach_id = coach_leads.coach_id and p.published and p.accepting_students)
  );
create policy "leads requester cancels" on public.coach_leads for delete to authenticated
  using (requester_id = (select auth.uid()) and status = 'new');

-- Author name is a snapshot ("Lucas M.") so readers never need the profile.
create or replace function public.prepare_testimonial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_name text;
begin
  select p.full_name into full_name from public.profiles p where p.id = new.author_id;
  new.author_name := coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Aluno')
    || coalesce(' ' || nullif(left(split_part(trim(full_name), ' ', 2), 1), '') || '.', '');
  insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
  values (new.coach_id, new.author_id, 'system'::public.notification_kind, 'Novo depoimento', 'Um aluno escreveu um depoimento. Aprove para aparecer no portfólio.', '/profissional/portfolio');
  return new;
end;
$$;
revoke all on function public.prepare_testimonial() from public, anon, authenticated;
create trigger portfolio_testimonials_prepare before insert on public.portfolio_testimonials
for each row execute function public.prepare_testimonial();

create or replace function public.notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(nullif(trim(full_name), ''), 'Aluno') into new.requester_name from public.profiles where id = new.requester_id;
  insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
  values (new.coach_id, new.requester_id, 'system'::public.notification_kind, 'Novo interessado', 'Alguém quer ser acompanhado por você: ' || new.goal || '.', '/profissional/portfolio');
  return new;
end;
$$;
revoke all on function public.notify_new_lead() from public, anon, authenticated;
create trigger coach_leads_notify before insert on public.coach_leads
for each row execute function public.notify_new_lead();

create or replace function public.set_testimonial_status(target_testimonial uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new_status not in ('published', 'hidden') then raise exception 'Status inválido'; end if;
  update public.portfolio_testimonials set status = new_status
  where id = target_testimonial and coach_id = (select auth.uid());
  if not found then raise exception 'Depoimento não encontrado'; end if;
end;
$$;
revoke all on function public.set_testimonial_status(uuid, text) from public, anon;
grant execute on function public.set_testimonial_status(uuid, text) to authenticated;

-- Accepting a lead creates a regular invite and sends its link to the student.
create or replace function public.respond_to_lead(target_lead uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  lead public.coach_leads;
  coach_name text;
  invite_token uuid;
begin
  select * into lead from public.coach_leads
  where id = target_lead and coach_id = (select auth.uid()) and status = 'new'
  for update;
  if lead.id is null then raise exception 'Pedido não encontrado ou já respondido'; end if;
  select full_name into coach_name from public.profiles where id = lead.coach_id;

  if accept then
    insert into public.professional_invites (professional_id) values (lead.coach_id) returning token into invite_token;
    update public.coach_leads set status = 'invited' where id = lead.id;
    insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
    values (lead.requester_id, lead.coach_id, 'system'::public.notification_kind, coach_name || ' aceitou seu pedido', 'Toque para aceitar o convite e começar o acompanhamento.', '/aluno/perfil?convite=' || invite_token);
  else
    update public.coach_leads set status = 'declined' where id = lead.id;
    insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
    values (lead.requester_id, lead.coach_id, 'system'::public.notification_kind, coach_name || ' não tem vagas agora', 'Veja outros treinadores disponíveis.', '/treinadores');
  end if;
end;
$$;
revoke all on function public.respond_to_lead(uuid, boolean) from public, anon;
grant execute on function public.respond_to_lead(uuid, boolean) to authenticated;

-- Directory of published portfolios. Returns only public portfolio fields.
create or replace function public.coach_directory(target_coach uuid default null)
returns table (
  coach_id uuid, name text, avatar_path text, avatar_updated_at timestamptz, frame text,
  headline text, about text, specialties text[], modality text, city text, state text,
  price_from_cents integer, years_experience smallint, instagram text, accepting_students boolean,
  rating numeric, reviews integer, transformations integer, students integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.coach_id,
    coalesce(sp.display_name, pr.full_name),
    sp.avatar_path, sp.avatar_updated_at, coalesce(sp.frame, 'none'),
    p.headline, p.about, p.specialties, p.modality, p.city, p.state,
    p.price_from_cents, p.years_experience, p.instagram, p.accepting_students,
    (select round(avg(t.rating)::numeric, 1) from public.portfolio_testimonials t where t.coach_id = p.coach_id and t.status = 'published'),
    (select count(*)::integer from public.portfolio_testimonials t where t.coach_id = p.coach_id and t.status = 'published'),
    (select count(*)::integer from public.portfolio_transformations t where t.coach_id = p.coach_id),
    (select count(*)::integer from public.professional_students s where s.professional_id = p.coach_id and s.status = 'active')
  from public.coach_portfolios p
  join public.profiles pr on pr.id = p.coach_id
  left join public.social_profiles sp on sp.id = p.coach_id
  where (p.published or p.coach_id = (select auth.uid()))
    and (target_coach is null or p.coach_id = target_coach);
$$;
revoke all on function public.coach_directory(uuid) from public, anon;
grant execute on function public.coach_directory(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "portfolio owner uploads" on storage.objects
for insert to authenticated with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "portfolio owner reads" on storage.objects
for select to authenticated using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "portfolio owner deletes" on storage.objects
for delete to authenticated using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
