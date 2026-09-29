-- Daily reminder run (12:00 UTC = 09:00 in Brasília). The shared secret lives
-- in Vault as 'billing_cron_secret' (created outside the repo); without it,
-- as in local development, the job does nothing.
create extension if not exists pg_net;

select cron.schedule('billing-reminders', '0 12 * * *', $$
  select net.http_post(
    url := 'https://evolink.solairew.com.br/api/billing/reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.decrypted_secret),
    body := '{}'::jsonb
  )
  from vault.decrypted_secrets s
  where s.name = 'billing_cron_secret';
$$);
