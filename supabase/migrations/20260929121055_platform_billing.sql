-- Evolink subscription for coaches, charged by Pix (Banco Inter).
-- Clients only read; the server writes with the service role after it
-- confirms the charge with the bank.

create table public.platform_plans (
  id text primary key check (id ~ '^[a-z0-9-]{2,30}$'),
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents > 0),
  student_limit integer check (student_limit is null or student_limit > 0),
  features text[] not null default '{}',
  position smallint not null default 0,
  active boolean not null default true
);

create table public.coach_subscriptions (
  coach_id uuid primary key references public.professional_profiles(id) on delete cascade,
  plan_id text not null references public.platform_plans(id),
  status text not null default 'active' check (status in ('active', 'canceled')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger coach_subscriptions_updated_at before update on public.coach_subscriptions for each row execute function public.set_updated_at();

create table public.platform_invoices (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.professional_profiles(id) on delete cascade,
  plan_id text not null references public.platform_plans(id),
  amount_cents integer not null check (amount_cents > 0),
  txid text not null unique check (txid ~ '^[a-zA-Z0-9]{26,35}$'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'canceled')),
  pix_copia_e_cola text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  end_to_end_id text,
  created_at timestamptz not null default now()
);
create index platform_invoices_coach_idx on public.platform_invoices(coach_id, created_at desc);

alter table public.platform_plans enable row level security;
alter table public.coach_subscriptions enable row level security;
alter table public.platform_invoices enable row level security;

create policy "plans are public to signed in users" on public.platform_plans for select to authenticated using (active);
create policy "coach reads own subscription" on public.coach_subscriptions for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach reads own invoices" on public.platform_invoices for select to authenticated using (coach_id = (select auth.uid()));

-- Placeholder prices; adjust in the table without a deploy.
insert into public.platform_plans (id, name, description, price_cents, student_limit, features, position) values
  ('essencial', 'Essencial', 'Para quem está começando a consultoria.', 4990, 15, array['Até 15 alunos ativos', 'Treinos, dietas e check-ins', 'Chat com alunos'], 1),
  ('pro', 'Pro', 'Para consultorias em crescimento.', 9990, 50, array['Até 50 alunos ativos', 'CRM e financeiro', 'Preparação de atletas', 'Destaque em eventos'], 2),
  ('elite', 'Elite', 'Sem limite de alunos.', 17990, null, array['Alunos ilimitados', 'Tudo do Pro', 'Suporte prioritário'], 3);

-- Marks a pending invoice as paid and extends the coach subscription by 30
-- days from the later of now and the current period end. Runs once per
-- invoice even if the webhook and the status polling race.
create or replace function public.settle_platform_invoice(target_invoice uuid, paid_e2e text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice public.platform_invoices;
begin
  update public.platform_invoices
     set status = 'paid', paid_at = now(), end_to_end_id = paid_e2e
   where id = target_invoice and status in ('pending', 'expired')
  returning * into invoice;
  if not found then return false; end if;

  insert into public.coach_subscriptions as s (coach_id, plan_id, status, current_period_end)
  values (invoice.coach_id, invoice.plan_id, 'active', now() + interval '30 days')
  on conflict (coach_id) do update
     set plan_id = excluded.plan_id,
         status = 'active',
         current_period_end = greatest(s.current_period_end, now()) + interval '30 days';

  insert into public.notifications (recipient_id, kind, title, body, href)
  values (invoice.coach_id, 'system'::public.notification_kind, 'Pagamento confirmado', 'Sua assinatura do Evolink foi renovada por 30 dias.', '/profissional/assinatura');
  return true;
end;
$$;
revoke all on function public.settle_platform_invoice(uuid, text) from public, anon, authenticated;
grant execute on function public.settle_platform_invoice(uuid, text) to service_role;
