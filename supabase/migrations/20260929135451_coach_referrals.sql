-- Coach referrals: a coach shares /cadastro?ref=CODE. The referred coach gets
-- a 30-day trial (instead of 14) and, on their first paid invoice, the
-- referrer gets 30 extra days.

create table public.coach_referral_codes (
  coach_id uuid primary key references public.professional_profiles(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.coach_referrals (
  referred_id uuid primary key references public.professional_profiles(id) on delete cascade,
  referrer_id uuid not null references public.professional_profiles(id) on delete cascade,
  referred_name text not null default '',
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check (referred_id <> referrer_id)
);
create index coach_referrals_referrer_idx on public.coach_referrals(referrer_id, created_at desc);

alter table public.coach_referral_codes enable row level security;
alter table public.coach_referrals enable row level security;
create policy "referral code owner reads" on public.coach_referral_codes for select to authenticated using (coach_id = (select auth.uid()));
create policy "referrer reads referrals" on public.coach_referrals for select to authenticated using (referrer_id = (select auth.uid()));

-- Returns the caller's code, creating it on first use.
create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing text;
  candidate text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not exists (select 1 from public.professional_profiles where id = (select auth.uid())) then
    raise exception 'Somente treinadores têm código de indicação';
  end if;
  select code into existing from public.coach_referral_codes where coach_id = (select auth.uid());
  if existing is not null then return existing; end if;
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    begin
      insert into public.coach_referral_codes (coach_id, code) values ((select auth.uid()), candidate);
      return candidate;
    exception when unique_violation then
      select code into existing from public.coach_referral_codes where coach_id = (select auth.uid());
      if existing is not null then return existing; end if;
    end;
  end loop;
end;
$$;
revoke all on function public.my_referral_code() from public, anon;
grant execute on function public.my_referral_code() to authenticated;

-- Runs after on_auth_user_created (triggers fire in name order), when the
-- professional profile and its trial already exist.
create or replace function public.record_coach_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  referrer uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'role', '') <> 'professional' then return new; end if;
  select coach_id into referrer from public.coach_referral_codes
  where code = upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));
  if referrer is null or referrer = new.id
     or not exists (select 1 from public.professional_profiles where id = new.id) then
    return new;
  end if;

  insert into public.coach_referrals (referred_id, referrer_id, referred_name)
  values (new.id, referrer, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Treinador'))
  on conflict (referred_id) do nothing;
  update public.coach_subscriptions set current_period_end = greatest(current_period_end, now() + interval '30 days')
  where coach_id = new.id and status = 'trial';
  insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
  values (referrer, new.id, 'system'::public.notification_kind, 'Nova indicação', 'Um treinador se cadastrou com o seu link. Quando ele assinar, você ganha 30 dias.', '/profissional/assinatura');
  return new;
end;
$$;
revoke all on function public.record_coach_referral() from public, anon, authenticated;
create trigger on_auth_user_referral after insert on auth.users
for each row execute function public.record_coach_referral();

-- Settling now also rewards the referrer on the referred coach's first payment.
create or replace function public.settle_platform_invoice(target_invoice uuid, paid_e2e text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice public.platform_invoices;
  referral public.coach_referrals;
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

  update public.coach_referrals set rewarded_at = now()
  where referred_id = invoice.coach_id and rewarded_at is null
  returning * into referral;
  if found then
    update public.coach_subscriptions
       set current_period_end = greatest(current_period_end, now()) + interval '30 days'
     where coach_id = referral.referrer_id;
    insert into public.notifications (recipient_id, actor_id, kind, title, body, href)
    values (referral.referrer_id, referral.referred_id, 'system'::public.notification_kind, 'Você ganhou 30 dias', referral.referred_name || ' assinou o Evolink com a sua indicação.', '/profissional/assinatura');
  end if;
  return true;
end;
$$;
revoke all on function public.settle_platform_invoice(uuid, text) from public, anon, authenticated;
grant execute on function public.settle_platform_invoice(uuid, text) to service_role;
