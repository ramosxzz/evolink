create table public.professional_invites (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_by uuid references public.student_profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.professional_invites enable row level security;
create index professional_invites_owner_idx on public.professional_invites(professional_id, status, created_at desc);

create policy "professional reads own invites" on public.professional_invites for select to authenticated
using (professional_id = (select auth.uid()));
create policy "professional creates own invites" on public.professional_invites for insert to authenticated
with check (professional_id = (select auth.uid()));
create policy "professional updates own pending invites" on public.professional_invites for update to authenticated
using (professional_id = (select auth.uid()) and status = 'pending')
with check (professional_id = (select auth.uid()));

create function public.redeem_professional_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.professional_invites;
  current_student uuid := auth.uid();
begin
  if current_student is null then
    raise exception 'Autenticação necessária';
  end if;
  if not exists (select 1 from public.student_profiles where id = current_student) then
    raise exception 'Apenas contas de aluno podem aceitar convites';
  end if;

  select * into invite_row from public.professional_invites
  where token = invite_token and status = 'pending' and expires_at > now()
  for update;

  if invite_row.id is null then
    raise exception 'Convite inválido, expirado ou já utilizado';
  end if;

  insert into public.professional_students(professional_id, student_id, status)
  values (invite_row.professional_id, current_student, 'active')
  on conflict (professional_id, student_id) do update set status = 'active';

  update public.professional_invites
  set status = 'accepted', accepted_by = current_student, accepted_at = now()
  where id = invite_row.id;

  insert into public.notifications(recipient_id, actor_id, kind, title, body, href)
  values (invite_row.professional_id, current_student, 'system', 'Novo aluno vinculado', 'Um aluno aceitou seu convite.', '/profissional/alunos');

  return invite_row.professional_id;
end;
$$;

revoke all on function public.redeem_professional_invite(uuid) from public, anon;
grant execute on function public.redeem_professional_invite(uuid) to authenticated;
grant select, insert, update on public.professional_invites to authenticated;
