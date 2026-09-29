-- Narrow, auditable operations used by the professional finance screen.
create or replace function public.set_linked_student_access(
  target_student uuid,
  new_status text,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new_status not in ('active', 'suspended') then
    raise exception 'Invalid access status';
  end if;

  if not exists (
    select 1
    from public.professional_students ps
    where ps.professional_id = auth.uid()
      and ps.student_id = target_student
      and ps.status = 'active'
  ) then
    raise exception 'Student is not linked to this professional';
  end if;

  update public.student_profiles
  set access_status = new_status,
      suspension_reason = case
        when new_status = 'suspended' then coalesce(nullif(trim(reason), ''), 'Acesso suspenso pelo profissional')
        else null
      end
  where id = target_student;
end;
$$;

revoke all on function public.set_linked_student_access(uuid, text, text) from public, anon;
grant execute on function public.set_linked_student_access(uuid, text, text) to authenticated;

drop policy if exists "notifications linked professionals insert" on public.notifications;
create policy "notifications linked professionals insert"
on public.notifications
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and exists (
    select 1
    from public.professional_students ps
    where ps.professional_id = (select auth.uid())
      and ps.student_id = notifications.recipient_id
      and ps.status = 'active'
  )
);
