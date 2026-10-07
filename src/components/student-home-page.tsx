"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { Apple, ArrowRight, CheckCircle2, ClipboardCheck, Clock3, Dumbbell, Flame, GlassWater, MessageCircle, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { Button, Shell } from "@/components/app-shell";
import { AnimatedNumber, ProgressBar, Reveal } from "@/components/ui/motion";
import { useCached } from "@/lib/page-cache";
import { addWater, getProgress, getStudentDiet, getWaterToday, getWeekCheckin, type Viewer } from "@/lib/evolink-data";
import { getLogbook } from "@/lib/logbook-data";
import { AchievementBadge } from "@/components/social/achievement-badge";
import { getAchievementCatalog, getMyAchievements, levelFor, type Achievement } from "@/lib/social-data";

type HomeData = {
  workout: Awaited<ReturnType<typeof getLogbook>>;
  diet: Awaited<ReturnType<typeof getStudentDiet>>;
  checkin: Awaited<ReturnType<typeof getWeekCheckin>>;
  progress: Awaited<ReturnType<typeof getProgress>>;
};

const card = "rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow";

export function StudentHomePage({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [data, setData] = useCached<HomeData | null>(`home:${viewer.id}`, null);
  const [water, setWater] = useCached<number | null>(`water:${viewer.id}`, null);

  useEffect(() => {
    let active = true;
    Promise.all([getLogbook(viewer.id), getStudentDiet(viewer.id), getWeekCheckin(viewer.id), getProgress(viewer.id)])
      .then(([workout, diet, checkin, progress]) => { if (active) setData({ workout, diet, checkin, progress }); });
    getWaterToday(viewer.id).then(value => { if (active) setWater(value); });
    return () => { active = false; };
  }, [viewer.id, setData, setWater]);

  const firstName = viewer.fullName.split(" ")[0];
  const coach = viewer.counterpart?.fullName.split(" ")[0];

  return (
    <Shell profile="student">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#087a50]">{greeting()}, {firstName}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Seu dia em um olhar.</h1>
          <p className="mt-2 text-sm text-[#71837b]">Treino, dieta e evolução no mesmo lugar.</p>
        </div>
        {coach && (
          <Button kind="outline" onClick={() => router.push("/aluno/chat")}>
            <MessageCircle size={17} />Falar com {coach}
          </Button>
        )}
      </section>

      <div className="mt-7 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Reveal index={0} className="lg:col-span-2 xl:col-span-2">
          <WorkoutCard data={data} onOpen={() => router.push("/aluno/treino")} />
        </Reveal>
        <Reveal index={1}>
          <WaterCard
            water={water}
            goal={viewer.student?.waterGoalMl ?? 2500}
            onAdd={async amount => {
              setWater(value => (value ?? 0) + amount);
              const { error } = await addWater(viewer.id, amount);
              if (error) setWater(value => (value ?? amount) - amount);
            }}
          />
        </Reveal>
        <Reveal index={2}>
          <MealCard data={data} onOpen={() => router.push("/aluno/dieta")} />
        </Reveal>
        <Reveal index={3}>
          <CheckinCard data={data} hasCoach={Boolean(viewer.counterpart)} onOpen={() => router.push("/aluno/check-in")} />
        </Reveal>
        <Reveal index={4}>
          <ProgressCard data={data} target={viewer.student?.targetWeightKg ?? null} onOpen={() => router.push("/aluno/evolucao")} />
        </Reveal>
        <Reveal index={5}>
          <RewardsCard viewerId={viewer.id} onOpen={() => router.push("/conquistas")} />
        </Reveal>
      </div>
    </Shell>
  );
}

function WorkoutCard({ data, onOpen }: { data: HomeData | null; onOpen: () => void }) {
  if (!data) return <Skeleton tall />;
  const { plan, plans, exercises, session, activeSets } = data.workout;
  // Exercises with at least one set logged in the session in progress.
  const doneIds = new Set(activeSets.map(set => set.workout_exercise_id));
  const done = session ? exercises.filter(exercise => doneIds.has(exercise.id)).length : 0;
  return (
    <section className="relative h-full overflow-hidden rounded-3xl bg-[#087a50] p-6 text-white soft-shadow">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#b8e986]/20 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[.14em] text-[#b8e986]">{session ? "TREINO EM ANDAMENTO" : plans.length > 1 ? "PRÓXIMO TREINO" : "TREINO DE HOJE"}</p>
          <h2 className="mt-2 text-2xl font-bold">{plan?.title ?? "Nenhum treino publicado"}</h2>
          <p className="mt-1 text-sm text-emerald-100">
            {plan
              ? `${exercises.length} exercícios${plan.estimatedMinutes ? ` · cerca de ${plan.estimatedMinutes} min` : ""}`
              : "Assim que seu profissional publicar, ele aparece aqui."}
          </p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15"><Dumbbell size={22} /></span>
      </div>
      {plan && (
        <div className="relative mt-6">
          {session ? (
            <>
              <div className="mb-2 flex justify-between text-xs font-semibold text-emerald-100">
                <span>{done} de {exercises.length} exercícios iniciados</span>
                <span className="tabular">{exercises.length ? Math.round((done / exercises.length) * 100) : 0}%</span>
              </div>
              <ProgressBar value={exercises.length ? done / exercises.length : 0} className="bg-[#b8e986]" track="bg-white/20" />
            </>
          ) : plans.length > 1 ? (
            <p className="text-xs font-semibold text-emerald-100">{plans.length} treinos na rotação</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {exercises.slice(0, 3).map(exercise => (
              <span key={exercise.id} className={`rounded-full px-3 py-1 text-xs font-semibold ${doneIds.has(exercise.id) ? "bg-[#b8e986] text-[#07352b]" : "bg-white/15"}`}>
                {exercise.name}
              </span>
            ))}
            {exercises.length > 3 && <span className="rounded-full bg-white/10 px-3 py-1 text-xs">+{exercises.length - 3}</span>}
          </div>
          <Button kind="soft" onClick={onOpen} className="mt-6">
            {session ? "Continuar treino" : "Começar treino"}<ArrowRight size={16} />
          </Button>
        </div>
      )}
    </section>
  );
}

/** A compact vessel keeps progress visible without turning the entire card into water. */
function WaterGauge({ level, pulse, reduceMotion }: { level: number; pulse: number; reduceMotion: boolean }) {
  const progress = Math.max(0.035, Math.min(1, level));
  return (
    <div aria-hidden className="relative grid h-[92px] w-[58px] shrink-0 place-items-center">
      {pulse > 0 && !reduceMotion && (
        <motion.span
          key={pulse}
          className="absolute inset-1 rounded-[22px] border border-[#58aee8]/55"
          initial={{ scale: 0.86, opacity: 0.75 }}
          animate={{ scale: 1.26, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      <div className="relative h-[86px] w-[48px] overflow-hidden rounded-[19px] border border-[var(--water-vessel-line)] bg-[var(--water-vessel)] shadow-[inset_0_1px_0_rgba(255,255,255,.5)]">
        <motion.div
          className="absolute inset-[4px] origin-bottom overflow-hidden rounded-[14px] bg-gradient-to-t from-[var(--water-fill-bottom)] to-[var(--water-fill-top)]"
          initial={false}
          animate={{ scaleY: progress }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 105, damping: 18, mass: 0.8 }}
        >
          {pulse > 0 && !reduceMotion && (
            <motion.span
              key={`shine-${pulse}`}
              className="absolute inset-y-0 w-5 -skew-x-12 bg-white/30 blur-[2px]"
              initial={{ x: -28 }}
              animate={{ x: 64 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          )}
        </motion.div>
        <span className="absolute right-[6px] top-[18px] h-px w-2 bg-[var(--water-vessel-line)]" />
        <span className="absolute right-[6px] top-[37px] h-px w-3 bg-[var(--water-vessel-line)]" />
        <span className="absolute right-[6px] top-[56px] h-px w-2 bg-[var(--water-vessel-line)]" />
      </div>
    </div>
  );
}

function WaterCard({ water, goal, onAdd }: { water: number | null; goal: number; onAdd: (amount: number) => void }) {
  const reduceMotion = Boolean(useReducedMotion());
  const [pulse, setPulse] = useState(0);
  const ratio = water === null ? 0 : water / goal;
  const done = ratio >= 1;
  const remaining = Math.max(0, goal - (water ?? 0));
  return (
    <section className={`${card} h-full overflow-hidden`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-[.12em] text-[#5f7169]">HIDRATAÇÃO</p>
          <GlassWater size={18} className="text-[#2a8bc8]" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-3xl font-bold tracking-tight">
              {water === null ? "..." : <AnimatedNumber value={water / 1000} format={value => `${value.toFixed(1).replace(".", ",")} L`} />}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#4f6259]">
              {Math.round(Math.min(1, ratio) * 100)}% da meta de {(goal / 1000).toFixed(1).replace(".", ",")} L
            </p>
            {done ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#087a50]"><CheckCircle2 size={14} />Meta concluída</p>
            ) : (
              <p className="mt-3 text-xs text-[#71837b]">Faltam {(remaining / 1000).toFixed(1).replace(".", ",")} L hoje</p>
            )}
          </div>
          <WaterGauge level={ratio} pulse={pulse} reduceMotion={reduceMotion} />
        </div>
        <div className="mt-auto grid grid-cols-3 gap-2 pt-6">
          {[200, 300, 500].map(amount => (
            <motion.button
              key={amount}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              onClick={() => { setPulse(value => value + 1); onAdd(amount); }}
              className="rounded-xl border border-[#cce4f2] bg-[#eef8fd] py-2 text-xs font-bold text-[#176f9f] transition hover:border-[#91c8e6] hover:bg-[#e3f3fb]"
            >
              +{amount} ml
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

function MealCard({ data, onOpen }: { data: HomeData | null; onOpen: () => void }) {
  if (!data) return <Skeleton />;
  const { plan, meals, completedMealIds } = data.diet;
  const next = meals.find(meal => !completedMealIds.has(meal.id));
  return (
    <button onClick={onOpen} className={`${card} group h-full w-full text-left transition hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[.12em] text-[#71837b]">ALIMENTAÇÃO</p>
        <Apple size={18} className="text-[#087a50]" />
      </div>
      {!plan ? (
        <p className="mt-3 text-sm text-[#71837b]">Sua dieta aparece aqui quando for publicada.</p>
      ) : next ? (
        <>
          <p className="mt-3 text-lg font-bold">{next.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-[#71837b]"><Clock3 size={14} />{next.scheduled_time?.slice(0, 5) ?? "Sem horário"}</p>
          <p className="mt-2 line-clamp-2 text-xs text-[#52665e]">{next.meal_items.map(item => item.description).join(" · ")}</p>
        </>
      ) : (
        <p className="mt-3 flex items-center gap-2 font-bold text-[#087a50]"><CheckCircle2 size={18} />Todas as refeições feitas</p>
      )}
      {plan && (
        <div className="mt-4">
          <ProgressBar value={meals.length ? completedMealIds.size / meals.length : 0} />
          <p className="mt-2 text-xs font-semibold text-[#71837b]">{completedMealIds.size} de {meals.length} refeições hoje</p>
        </div>
      )}
    </button>
  );
}

function CheckinCard({ data, hasCoach, onOpen }: { data: HomeData | null; hasCoach: boolean; onOpen: () => void }) {
  if (!data) return <Skeleton />;
  const checkin = data.checkin;
  const state = !checkin || checkin.status === "draft" ? "pending" : checkin.status === "submitted" ? "sent" : "reviewed";
  const copy = {
    pending: { title: "Check-in da semana", text: hasCoach ? "Conte como foi sua semana. Leva 1 minuto." : "Vincule um profissional para enviar check-ins.", tone: "bg-[#fff4d8] text-[#9a6800]", label: "Pendente" },
    sent: { title: "Check-in enviado", text: "Seu profissional vai responder em breve.", tone: "bg-[#e6f2fb] text-[#1f6fa8]", label: "Aguardando" },
    reviewed: { title: "Feedback recebido", text: checkin?.professional_feedback ?? "Seu profissional respondeu.", tone: "bg-[#e7f4ec] text-[#087a50]", label: "Respondido" },
  }[state];
  return (
    <button onClick={onOpen} disabled={!hasCoach} className={`${card} h-full w-full text-left transition hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[.12em] text-[#71837b]">CHECK-IN</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${copy.tone}`}>{copy.label}</span>
      </div>
      <p className="mt-3 flex items-center gap-2 text-lg font-bold"><ClipboardCheck size={18} className="text-[#087a50]" />{copy.title}</p>
      <p className="mt-1 line-clamp-3 text-sm text-[#71837b]">{copy.text}</p>
    </button>
  );
}

function ProgressCard({ data, target, onOpen }: { data: HomeData | null; target: number | null; onOpen: () => void }) {
  if (!data) return <Skeleton />;
  const points = [...data.progress].reverse().filter(record => record.weight_kg !== null).map(record => ({ weight: Number(record.weight_kg) }));
  const current = points.at(-1)?.weight;
  const delta = current !== undefined && points.length > 1 ? current - points[0].weight : null;
  const Trend = delta !== null && delta > 0 ? TrendingUp : TrendingDown;
  return (
    <button onClick={onOpen} className={`${card} h-full w-full text-left transition hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[.12em] text-[#71837b]">EVOLUÇÃO</p>
        {delta !== null && (
          <span className="flex items-center gap-1 text-xs font-bold text-[#087a50]">
            <Trend size={14} />{delta > 0 ? "+" : ""}{delta.toFixed(1).replace(".", ",")} kg
          </span>
        )}
      </div>
      {current === undefined ? (
        <p className="mt-3 text-sm text-[#71837b]">Registre seu peso para acompanhar a evolução.</p>
      ) : (
        <>
          <p className="mt-3 text-3xl font-bold tracking-tight">
            <AnimatedNumber value={current} format={value => `${value.toFixed(1).replace(".", ",")} kg`} />
          </p>
          {target && <p className="text-xs text-[#71837b]">Meta: {String(target).replace(".", ",")} kg</p>}
          {points.length > 1 && (
            <div className="-mx-1 mt-3 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points}>
                  <defs>
                    <linearGradient id="homeWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#087a50" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#087a50" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                  <Area type="monotone" dataKey="weight" stroke="var(--emerald)" strokeWidth={2} fill="url(#homeWeight)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </button>
  );
}

function RewardsCard({ viewerId, onOpen }: { viewerId: string; onOpen: () => void }) {
  const [state, setState] = useState<{ streak: number; points: number; latest: Achievement | null; count: number } | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([getAchievementCatalog(), getMyAchievements(viewerId)]).then(([catalog, mine]) => {
      if (!active) return;
      const earned = [...mine.earned].sort((a, b) => b.earned_at.localeCompare(a.earned_at));
      const byCode = new Map(catalog.achievements.map(item => [item.code, item]));
      setState({
        streak: Number(mine.metrics.current_streak_days ?? 0),
        points: earned.reduce((total, item) => total + (byCode.get(item.code)?.points ?? 0), 0),
        latest: earned[0] ? byCode.get(earned[0].code) ?? null : null,
        count: earned.length,
      });
    });
    return () => { active = false; };
  }, [viewerId]);
  if (!state) return <Skeleton />;
  const level = levelFor(state.points);
  return (
    <button onClick={onOpen} className={`${card} h-full w-full text-left transition hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[.12em] text-[#71837b]">CONQUISTAS</p>
        <span className="rounded-full bg-[#07352b] px-2.5 py-1 text-[11px] font-bold text-[#b8e986]">Nível {level.level}</span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        {state.latest ? (
          <AchievementBadge achievement={state.latest} earned size="sm" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4f0] text-[#087a50]">
            <Trophy size={18} />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-bold">{state.latest ? state.latest.title : "Sua primeira conquista te espera"}</p>
          <p className="text-xs text-[#71837b]">{state.count} {state.count === 1 ? "conquista" : "conquistas"} · {state.points} pontos</p>
        </div>
      </div>
      <p className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold ${state.streak >= 3 ? "text-[#d17918]" : "text-[#52665e]"}`}>
        <Flame size={16} aria-hidden />
        {state.streak} {state.streak === 1 ? "dia" : "dias"} em sequência
      </p>
      <div className="mt-2"><ProgressBar value={level.progress} className="bg-gradient-to-r from-[#087a50] to-[#b8e986]" /></div>
    </button>
  );
}

function Skeleton({ tall = false }: { tall?: boolean }) {
  return <div className={`${tall ? "h-72" : "h-44"} animate-pulse rounded-3xl bg-white soft-shadow`} />;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}
