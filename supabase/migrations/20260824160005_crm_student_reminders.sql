-- CRM operacional: regras de lembrete por aluno e histórico de disparos.
-- O canal inicial é a caixa de notificações do app; o modelo aceita novos
-- canais futuramente sem alterar a agenda configurada pelo profissional.

create extension if not exists pg_cron with schema pg_catalog;

create table public.crm_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  kind text not null check (kind in ('weekly_feedback', 'workout_expiry', 'diet_expiry', 'cardio_expiry', 'payment', 'custom')),
  title text not null check (length(trim(title)) between 2 and 100),
  message text not null check (length(trim(message)) between 2 and 500),
  frequency text not null check (frequency in ('once', 'weekly', 'monthly')),
  target_date date,
  weekday smallint check (weekday between 0 and 6),
  day_of_month smallint check (day_of_month between 1 and 28),
  send_time time not null default '09:00',
  timezone text not null default 'America/Sao_Paulo',
  next_run_at timestamptz,
  last_run_at timestamptz,
  active boolean not null default true,
  related_entity_type text check (related_entity_type in ('workout', 'diet', 'cardio', 'payment', 'checkin', 'custom')),
  related_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_rules_schedule_shape check (
    (frequency = 'once' and target_date is not null)
    or (frequency = 'weekly' and weekday is not null)
    or (frequency = 'monthly' and day_of_month is not null)
  ),
  constraint crm_rules_active_next_run check (not active or next_run_at is not null)
);

create table public.crm_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.crm_reminder_rules(id) on delete cascade,
  recipient_id uuid not null references public.student_profiles(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null default 'sent' check (status in ('sent', 'failed', 'cancelled')),
  notification_id uuid references public.notifications(id) on delete set null,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (rule_id, scheduled_for)
);

create index crm_rules_professional_next_idx
  on public.crm_reminder_rules(professional_id, active, next_run_at);
create index crm_rules_student_idx
  on public.crm_reminder_rules(student_id, active);
create index crm_deliveries_rule_sent_idx
  on public.crm_reminder_deliveries(rule_id, sent_at desc);

create trigger crm_reminder_rules_updated_at
before update on public.crm_reminder_rules
for each row execute function public.set_updated_at();

alter table public.crm_reminder_rules enable row level security;
alter table public.crm_reminder_deliveries enable row level security;

create policy "crm rules professional reads"
on public.crm_reminder_rules for select to authenticated
using (professional_id = (select auth.uid()));

create policy "crm rules professional inserts"
on public.crm_reminder_rules for insert to authenticated
with check (
  professional_id = (select auth.uid())
  and exists (
    select 1 from public.professional_students ps
    where ps.professional_id = (select auth.uid())
      and ps.student_id = crm_reminder_rules.student_id
      and ps.status = 'active'
  )
);

create policy "crm rules professional updates"
on public.crm_reminder_rules for update to authenticated
using (professional_id = (select auth.uid()))
with check (
  professional_id = (select auth.uid())
  and exists (
    select 1 from public.professional_students ps
    where ps.professional_id = (select auth.uid())
      and ps.student_id = crm_reminder_rules.student_id
      and ps.status = 'active'
  )
);

create policy "crm rules professional deletes"
on public.crm_reminder_rules for delete to authenticated
using (professional_id = (select auth.uid()));

create policy "crm deliveries professional reads"
on public.crm_reminder_deliveries for select to authenticated
using (exists (
  select 1 from public.crm_reminder_rules r
  where r.id = crm_reminder_deliveries.rule_id
    and r.professional_id = (select auth.uid())
));

create policy "crm deliveries professional inserts"
on public.crm_reminder_deliveries for insert to authenticated
with check (exists (
  select 1 from public.crm_reminder_rules r
  where r.id = crm_reminder_deliveries.rule_id
    and r.professional_id = (select auth.uid())
    and r.student_id = crm_reminder_deliveries.recipient_id
));

grant select, insert, update, delete on public.crm_reminder_rules to authenticated;
grant select, insert on public.crm_reminder_deliveries to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.dispatch_due_crm_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminder public.crm_reminder_rules%rowtype;
  delivery_id uuid;
  created_notification uuid;
  notification_kind public.notification_kind;
  notification_href text;
  following_run timestamptz;
  delivered_count integer := 0;
begin
  for reminder in
    select *
    from public.crm_reminder_rules
    where active
      and next_run_at is not null
      and next_run_at <= now()
    order by next_run_at
    for update skip locked
  loop
    insert into public.crm_reminder_deliveries (
      rule_id, recipient_id, scheduled_for, status
    ) values (
      reminder.id, reminder.student_id, reminder.next_run_at, 'sent'
    )
    on conflict (rule_id, scheduled_for) do nothing
    returning id into delivery_id;

    if delivery_id is not null then
      notification_kind := case reminder.kind
        when 'weekly_feedback' then 'checkin'::public.notification_kind
        when 'workout_expiry' then 'workout'::public.notification_kind
        when 'diet_expiry' then 'diet'::public.notification_kind
        when 'cardio_expiry' then 'cardio'::public.notification_kind
        when 'payment' then 'payment'::public.notification_kind
        else 'system'::public.notification_kind
      end;
      notification_href := case reminder.kind
        when 'weekly_feedback' then '/aluno/check-in'
        when 'workout_expiry' then '/aluno/treino'
        when 'diet_expiry' then '/aluno/dieta'
        when 'cardio_expiry' then '/aluno/cardio'
        when 'payment' then '/aluno/perfil'
        else '/aluno'
      end;

      insert into public.notifications (
        recipient_id, actor_id, kind, title, body, href
      ) values (
        reminder.student_id,
        reminder.professional_id,
        notification_kind,
        reminder.title,
        reminder.message,
        notification_href
      ) returning id into created_notification;

      update public.crm_reminder_deliveries
      set notification_id = created_notification,
          sent_at = now()
      where id = delivery_id;

      delivered_count := delivered_count + 1;
    end if;

    if reminder.frequency = 'once' then
      update public.crm_reminder_rules
      set active = false,
          last_run_at = now(),
          next_run_at = null
      where id = reminder.id;
    elsif reminder.frequency = 'weekly' then
      following_run := reminder.next_run_at + interval '7 days';
      while following_run <= now() loop
        following_run := following_run + interval '7 days';
      end loop;
      update public.crm_reminder_rules
      set last_run_at = now(), next_run_at = following_run
      where id = reminder.id;
    else
      following_run := (
        date_trunc('month', reminder.next_run_at at time zone reminder.timezone)
        + interval '1 month'
        + make_interval(days => reminder.day_of_month - 1)
        + reminder.send_time
      ) at time zone reminder.timezone;
      while following_run <= now() loop
        following_run := (
          date_trunc('month', following_run at time zone reminder.timezone)
          + interval '1 month'
          + make_interval(days => reminder.day_of_month - 1)
          + reminder.send_time
        ) at time zone reminder.timezone;
      end loop;
      update public.crm_reminder_rules
      set last_run_at = now(), next_run_at = following_run
      where id = reminder.id;
    end if;
  end loop;

  return delivered_count;
end;
$$;

revoke all on function private.dispatch_due_crm_reminders() from public, anon, authenticated;

select cron.schedule(
  'evolink-crm-reminders',
  '* * * * *',
  'select private.dispatch_due_crm_reminders();'
);
