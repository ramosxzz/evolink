-- Keep the notification bell useful without allowing clients to create
-- notifications for arbitrary recipients.  These functions are trigger-only.
create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
  values (
    new.recipient_id,
    new.sender_id,
    'message',
    'Nova mensagem',
    left(new.body, 140),
    case when exists (select 1 from public.professional_profiles where id = new.recipient_id)
      then '/profissional/chat' else '/aluno/chat' end
  );
  return new;
end;
$$;

create or replace function public.notify_checkin_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
    values (new.professional_id, new.student_id, 'checkin', 'Novo check-in', 'Um aluno enviou o check-in semanal.', '/profissional/check-ins');
  end if;
  return new;
end;
$$;

create or replace function public.notify_published_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
    values (
      new.student_id,
      new.professional_id,
      tg_argv[0]::public.notification_kind,
      case when tg_argv[0] = 'workout' then 'Novo treino disponível' else 'Nova dieta disponível' end,
      new.title,
      case when tg_argv[0] = 'workout' then '/aluno/treino' else '/aluno/dieta' end
    );
  end if;
  return new;
end;
$$;

create trigger messages_create_notification
after insert on public.messages
for each row execute function public.notify_message_recipient();

create trigger checkins_create_notification
after insert or update of status on public.check_ins
for each row execute function public.notify_checkin_submitted();

create trigger workouts_create_notification
after insert or update of status on public.workout_plans
for each row execute function public.notify_published_plan('workout');

create trigger diets_create_notification
after insert or update of status on public.diet_plans
for each row execute function public.notify_published_plan('diet');

revoke all on function public.notify_message_recipient() from public, anon, authenticated;
revoke all on function public.notify_checkin_submitted() from public, anon, authenticated;
revoke all on function public.notify_published_plan() from public, anon, authenticated;
