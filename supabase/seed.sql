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

-- Published workouts (A/B rotation) and diet for Lucas.
insert into public.workout_plans (id, student_id, professional_id, title, objective, estimated_minutes, status, starts_on, ends_on)
values ('00000000-0000-4000-c000-000000000011', '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000001',
        'Treino A · Inferiores', 'Hipertrofia de quadríceps e glúteos', 60, 'published', current_date - 7, current_date + 35);

insert into public.workout_exercises (workout_plan_id, name, muscle_group, sets, repetitions, rest_seconds, suggested_load, position)
values
  ('00000000-0000-4000-c000-000000000011', 'Agachamento livre',          'Quadríceps', 4, '8-10',  120, '80 kg', 1),
  ('00000000-0000-4000-c000-000000000011', 'Leg press 45°',              'Quadríceps', 4, '10-12', 90,  '200 kg', 2),
  ('00000000-0000-4000-c000-000000000011', 'Levantamento terra romeno',  'Posterior',  3, '10',    90,  '60 kg', 3),
  ('00000000-0000-4000-c000-000000000011', 'Cadeira extensora',          'Quadríceps', 3, '12-15', 60,  '45 kg', 4),
  ('00000000-0000-4000-c000-000000000011', 'Elevação pélvica',           'Glúteos',    3, '12',    60,  '70 kg', 5),
  ('00000000-0000-4000-c000-000000000011', 'Panturrilha em pé',          'Panturrilha',4, '15',    45,  '50 kg', 6);

insert into public.workout_plans (id, student_id, professional_id, title, objective, estimated_minutes, status, starts_on, ends_on)
values ('00000000-0000-4000-c000-000000000012', '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000001',
        'Treino B · Superiores', 'Peito, costas e ombros', 55, 'published', current_date - 7, current_date + 35);

insert into public.workout_exercises (workout_plan_id, name, muscle_group, sets, repetitions, rest_seconds, suggested_load, position)
values
  ('00000000-0000-4000-c000-000000000012', 'Supino reto',            'Peito',   4, '8-10',  120, '70 kg', 1),
  ('00000000-0000-4000-c000-000000000012', 'Remada curvada',         'Costas',  4, '8-10',  90,  '60 kg', 2),
  ('00000000-0000-4000-c000-000000000012', 'Desenvolvimento halter', 'Ombros',  3, '10-12', 90,  '22 kg', 3),
  ('00000000-0000-4000-c000-000000000012', 'Puxada frontal',         'Costas',  3, '10-12', 75,  '55 kg', 4),
  ('00000000-0000-4000-c000-000000000012', 'Elevação lateral',       'Ombros',  3, '15',    45,  '10 kg', 5);

insert into public.diet_plans (id, student_id, professional_id, title, status, starts_on, ends_on)
values ('00000000-0000-4000-d000-000000000011', '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000001',
        'Cutting · 2.200 kcal', 'published', current_date - 7, current_date + 21);

insert into public.meals (id, diet_plan_id, name, scheduled_time, position)
values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000011', 'Café da manhã',  '07:00', 1),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-d000-000000000011', 'Almoço',         '12:30', 2),
  ('00000000-0000-4000-e000-000000000003', '00000000-0000-4000-d000-000000000011', 'Pré-treino',     '16:30', 3),
  ('00000000-0000-4000-e000-000000000004', '00000000-0000-4000-d000-000000000011', 'Jantar',         '20:00', 4);

insert into public.meal_items (meal_id, description, quantity, unit, position, substitutions)
values
  ('00000000-0000-4000-e000-000000000001', 'Ovos mexidos',        3,   'un', 1, '["2 fatias de queijo branco"]'),
  ('00000000-0000-4000-e000-000000000001', 'Pão integral',        2,   'fatias', 2, '["40 g de aveia"]'),
  ('00000000-0000-4000-e000-000000000001', 'Banana',              1,   'un', 3, '[]'),
  ('00000000-0000-4000-e000-000000000002', 'Arroz branco',        150, 'g', 1, '["200 g de batata inglesa"]'),
  ('00000000-0000-4000-e000-000000000002', 'Feijão',              100, 'g', 2, '[]'),
  ('00000000-0000-4000-e000-000000000002', 'Peito de frango',     150, 'g', 3, '["150 g de patinho moído"]'),
  ('00000000-0000-4000-e000-000000000003', 'Iogurte natural',     170, 'g', 1, '[]'),
  ('00000000-0000-4000-e000-000000000003', 'Whey protein',        30,  'g', 2, '[]'),
  ('00000000-0000-4000-e000-000000000004', 'Tilápia grelhada',    180, 'g', 1, '["150 g de frango"]'),
  ('00000000-0000-4000-e000-000000000004', 'Legumes no vapor',    200, 'g', 2, '[]');

-- Sample events (fictitious, local development only).
insert into public.events (id, created_by, title, kind, federation_code, starts_on, city, state, venue, description, categories)
values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-a000-000000000001', 'Campeonato Gaúcho de Exemplo', 'campeonato', 'ifbb_brasil', current_date + 45, 'Porto Alegre', 'RS', 'Ginásio de Exemplo',
   'Evento fictício para testes locais.', array['Bodybuilding', 'Classic Physique', 'Men''s Physique', 'Bikini', 'Wellness']),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000001', 'Seletiva Natural Serra (exemplo)', 'seletiva', 'wnbf', current_date + 80, 'Caxias do Sul', 'RS', null,
   'Evento fictício para testes locais.', array['Men''s Physique', 'Bikini', 'Estreantes']),
  ('00000000-0000-4000-f000-000000000003', '00000000-0000-4000-a000-000000000001', 'Open Nacional de Exemplo', 'campeonato', 'npc', current_date - 10, 'São Paulo', 'SP', 'Centro de Eventos Exemplo',
   'Evento fictício que já aconteceu, para testar avaliações.', array['Bodybuilding', 'Bikini', 'Figure']);
