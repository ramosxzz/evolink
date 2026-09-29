drop function public.redeem_professional_invite(uuid);

create function public.redeem_professional_invite(invite_token uuid, invited_student uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.professional_invites;
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
