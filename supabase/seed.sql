-- Local development seed. Runs only on `supabase db reset` / `supabase start`
-- against the local stack; never applied to the hosted project.
--
-- Test accounts (password for all: Evo-Oio6trISml)
--   coach@evolink.test    professional  Camila Fernandes
--   lucas@evolink.test    student       Lucas Martins   (check-in pending review)
--   mariana@evolink.test  student       Mariana Alves
--   rafael@evolink.test   student       Rafael Nunes    (overdue payment)

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'coach@evolink.test',   'Camila Fernandes', 'professional'),
      ('00000000-0000-4000-a000-000000000011'::uuid, 'lucas@evolink.test',   'Lucas Martins',    'student'),
      ('00000000-0000-4000-a000-000000000012'::uuid, 'mariana@evolink.test', 'Mariana Alves',    'student'),
      ('00000000-0000-4000-a000-000000000013'::uuid, 'rafael@evolink.test',  'Rafael Nunes',     'student')
    ) as t(id, email, full_name, role)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('Evo-Oio6trISml', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', u.full_name, 'role', u.role),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;

update public.professional_profiles
set specialty = 'Nutrição esportiva e treinamento', bio = 'Preparação para fisiculturismo e emagrecimento.'
where id = '00000000-0000-4000-a000-000000000001';

update public.student_profiles as s
set goal = v.goal, started_at = current_date - 70, initial_weight_kg = v.initial, target_weight_kg = v.target
from (values
  ('00000000-0000-4000-a000-000000000011'::uuid, 'Redução de gordura', 92.0, 82.0),
  ('00000000-0000-4000-a000-000000000012'::uuid, 'Ganho de massa',     58.5, 63.0),
  ('00000000-0000-4000-a000-000000000013'::uuid, 'Qualidade de vida',  97.0, 88.0)
) as v(id, goal, initial, target)
where s.id = v.id;

insert into public.professional_students (professional_id, student_id)
select '00000000-0000-4000-a000-000000000001', id
from public.student_profiles;

-- Ten weeks of measurements for the charts.
insert into public.progress_records (student_id, recorded_on, weight_kg, waist_cm, arm_cm)
select
  s.id,
  current_date - (w * 7),
  round((s.initial_weight_kg + (s.target_weight_kg - s.initial_weight_kg) * (9 - w) / 14.0)::numeric, 1),
  case when s.target_weight_kg < s.initial_weight_kg then 98 - (9 - w) * 0.6 else 72 + (9 - w) * 0.2 end,
  case when s.target_weight_kg < s.initial_weight_kg then 36 else 30.5 + (9 - w) * 0.15 end
from public.student_profiles s, generate_series(0, 9) as w
where s.id <> '00000000-0000-4000-a000-000000000013';

insert into public.check_ins (
  student_id, professional_id, status, week_of, nutrition_score, training_days,
  energy_score, sleep_score, stress_score, current_weight_kg, difficulties, student_message, submitted_at
) values (
  '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000001', 'submitted',
  date_trunc('week', current_date)::date, 4, 5, 3, 4, 2, 87.9,
  'Fome no fim da tarde.', 'Semana boa, só senti falta de um lanche maior antes do treino.', now() - interval '3 hours'
);

insert into public.student_subscriptions (id, professional_id, student_id, amount, due_day, auto_suspend)
values
  ('00000000-0000-4000-b000-000000000011', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000011', 250, 10, false),
  ('00000000-0000-4000-b000-000000000012', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000012', 300, 15, false),
  ('00000000-0000-4000-b000-000000000013', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000013', 250, 5,  false);

insert into public.subscription_payments (subscription_id, due_date, amount, status, paid_at, payment_method)
values
  ('00000000-0000-4000-b000-000000000011', current_date - 20, 250, 'paid',    now() - interval '20 days', 'pix'),
  ('00000000-0000-4000-b000-000000000011', current_date + 10, 250, 'pending', null, null),
  ('00000000-0000-4000-b000-000000000012', current_date - 15, 300, 'paid',    now() - interval '15 days', 'pix'),
  ('00000000-0000-4000-b000-000000000013', current_date - 12, 250, 'overdue', null, null);
