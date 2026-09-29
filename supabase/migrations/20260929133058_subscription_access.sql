-- Free trial, plan student limits and access after the subscription ends.
-- Every coach has a coach_subscriptions row: a 14-day Pro trial starts when
-- the professional profile is created. After the period ends there are 3 days
-- of grace, then the coach area is locked until a new payment.

alter table public.coach_subscriptions drop constraint coach_subscriptions_status_check;
alter table public.coach_subscriptions add constraint coach_subscriptions_status_check check (status in ('trial', 'active', 'canceled'));

create or replace function public.start_coach_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.coach_subscriptions (coach_id, plan_id, status, current_period_end)
  values (new.id, 'pro', 'trial', now() + interval '14 days')
  on conflict (coach_id) do nothing;
  return new;
end;
$$;
revoke all on function public.start_coach_trial() from public, anon, authenticated;
create trigger professional_profiles_start_trial after insert on public.professional_profiles
for each row execute function public.start_coach_trial();

-- Existing coaches get their 14 days from today.
insert into public.coach_subscriptions (coach_id, plan_id, status, current_period_end)
select id, 'pro', 'trial', now() + interval '14 days' from public.professional_profiles
on conflict (coach_id) do nothing;

-- 'active' while paid or in trial, 'grace' for 3 days after, then 'expired'.
create or replace function public.coach_access(target_coach uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.current_period_end > now() then 'active'
    when s.current_period_end > now() - interval '3 days' then 'grace'
    else 'expired'
  end
  from public.coach_subscriptions s
  where s.coach_id = target_coach and s.status <> 'canceled'
  union all select 'expired'
  limit 1;
$$;
revoke all on function public.coach_access(uuid) from public, anon;
grant execute on function public.coach_access(uuid) to authenticated, service_role;

-- Invites respect the coach access and the plan student limit.
create or replace function public.redeem_professional_invite(invite_token uuid, invited_student uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.professional_invites;
  plan_limit integer;
  linked integer;
begin
  if invited_student is null or not exists (select 1 from public.student_profiles where id = invited_student) then
    raise exception 'Conta de aluno inválida';
  end if;

  select * into invite_row from public.professional_invites
  where token = invite_token and status = 'pending' and expires_at > now()
  for update;

  if invite_row.id is null then
    raise exception 'Convite inválido, expirado ou já utilizado';
  end if;

  if public.coach_access(invite_row.professional_id) = 'expired' then
    raise exception 'A assinatura do seu treinador está pendente. Peça para ele regularizar e tente de novo.';
  end if;

  select p.student_limit into plan_limit
  from public.coach_subscriptions s join public.platform_plans p on p.id = s.plan_id
  where s.coach_id = invite_row.professional_id;
  select count(*) into linked from public.professional_students
  where professional_id = invite_row.professional_id and status = 'active' and student_id <> invited_student;
  if plan_limit is not null and linked >= plan_limit then
    raise exception 'Seu treinador atingiu o limite de alunos do plano. Peça para ele trocar de plano e tente de novo.';
  end if;

  insert into public.professional_students(professional_id, student_id, status)
  values (invite_row.professional_id, invited_student, 'active')
  on conflict (professional_id, student_id) do update set status = 'active';

  update public.professional_invites
  set status = 'accepted', accepted_by = invited_student, accepted_at = now()
  where id = invite_row.id;

  insert into public.notifications(recipient_id, actor_id, kind, title, body, href)
  values (invite_row.professional_id, invited_student, 'system', 'Novo aluno vinculado', 'Um aluno aceitou seu convite.', '/profissional/alunos');

  return invite_row.professional_id;
end;
$$;
revoke all on function public.redeem_professional_invite(uuid, uuid) from public, anon, authenticated;
grant execute on function public.redeem_professional_invite(uuid, uuid) to service_role;

-- One reminder of each kind per billing period.
create table public.billing_reminders (
  coach_id uuid not null references public.professional_profiles(id) on delete cascade,
  period_end timestamptz not null,
  kind text not null check (kind in ('ending', 'expired')),
  sent_at timestamptz not null default now(),
  primary key (coach_id, period_end, kind)
);
alter table public.billing_reminders enable row level security;
