-- Índices de apoio aos relacionamentos usados no histórico do CRM.
create index if not exists crm_deliveries_recipient_idx
  on public.crm_reminder_deliveries(recipient_id);

create index if not exists crm_deliveries_notification_idx
  on public.crm_reminder_deliveries(notification_id)
  where notification_id is not null;
