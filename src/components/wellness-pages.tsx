"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Activity, Check, Flame, Footprints, HeartPulse, Moon, Pill, Plus, Sparkles, Timer, Trash2, X } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { AnimatedNumber, ProgressBar, Reveal } from "@/components/ui/motion";
import { addDays, localDate, weekStart } from "@/lib/dates";
import type { Viewer } from "@/lib/evolink-data";
import {
  cardioModalities,
  deleteCardioLog,
  getStudentCardio,
  getStudentHabits,
  logCardio,
  setHabitLog,
  type CardioLog,
  type CardioPlan,
  type HabitGoal,
  type HabitKind,
  type HabitLog,
} from "@/lib/wellness-data";

const card = "rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow";
const field = "mt-2 w-full rounded-xl border border-[#dbe7e0] bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";
const distanceModalities = new Set(["Corrida", "Caminhada", "Bicicleta", "Esteira"]);
const logDay = (log: CardioLog) => localDate(new Date(log.completed_at));

// Cardio ---------------------------------------------------------------------

export function CardioPage({ viewer }: { viewer: Viewer }) {
  const [plans, setPlans] = useState<CardioPlan[] | null>(null);
  const [logs, setLogs] = useState<CardioLog[]>([]);
  const [draft, setDraft] = useState<{ plan?: CardioPlan } | null>(null);

  useEffect(() => {
    let active = true;
    getStudentCardio(viewer.id).then(result => {
      if (!active) return;
      setPlans(result.plans);
      setLogs(result.logs);
    });
    return () => { active = false; };
  }, [viewer.id]);

  const stats = useMemo(() => {
    const monday = weekStart();
    const monthStart = localDate(addDays(-29));
    const week = logs.filter(log => logDay(log) >= monday);
    const days = new Set(logs.map(logDay));
    let streak = 0;
    for (let cursor = days.has(localDate()) ? new Date() : addDays(-1); days.has(localDate(cursor)); cursor = addDays(-1, cursor)) streak++;
    return {
      weekMinutes: week.reduce((total, log) => total + log.duration_minutes, 0),
      weekSessions: week.length,
      monthKm: logs.filter(log => logDay(log) >= monthStart).reduce((total, log) => total + Number(log.distance_km ?? 0), 0),
      streak,
      byPlan: (planId: string) => week.filter(log => log.cardio_plan_id === planId).length,
    };
  }, [logs]);

  const prescribed = (plans ?? []).reduce((total, plan) => total + plan.sessions_per_week, 0);

  return (
    <Shell profile="student">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle kicker="CARDIO" title="Seu condicionamento" text="Registre corridas, pedaladas e sessões prescritas." />
        <Button onClick={() => setDraft({})}><Plus size={17} />Registrar cardio</Button>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Reveal index={0}><Tile icon={Timer} label="MINUTOS NA SEMANA" value={stats.weekMinutes} /></Reveal>
        <Reveal index={1}><Tile icon={Activity} label="SESSÕES NA SEMANA" value={stats.weekSessions} suffix={prescribed ? ` / ${prescribed}` : ""} /></Reveal>
        <Reveal index={2}><Tile icon={Footprints} label="KM EM 30 DIAS" value={stats.monthKm} decimals={1} /></Reveal>
        <Reveal index={3}><Tile icon={Flame} label="SEQUÊNCIA" value={stats.streak} suffix={stats.streak === 1 ? " dia" : " dias"} highlight={stats.streak >= 3} /></Reveal>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Reveal index={4} className={card}>
          <h2 className="font-bold">Prescrito pelo seu profissional</h2>
          {plans === null ? (
            <div className="mt-4 h-32 animate-pulse rounded-2xl bg-[#f3f8f5]" />
          ) : plans.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-[#f7faf8] p-4 text-sm text-[#71837b]">Nenhum cardio prescrito. Você pode registrar suas atividades livremente.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {plans.map(plan => {
                const done = stats.byPlan(plan.id);
                return (
                  <article key={plan.id} className="rounded-2xl bg-[#f7faf8] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{plan.title}</p>
                        <p className="text-sm text-[#71837b]">{plan.modality} · {plan.duration_minutes} min · {plan.intensity}</p>
                        {plan.notes && <p className="mt-1 text-xs text-[#52665e]">{plan.notes}</p>}
                      </div>
                      <Button kind="soft" className="shrink-0 px-3 py-2 text-xs" onClick={() => setDraft({ plan })}>Registrar</Button>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={done / plan.sessions_per_week} />
                      <p className="mt-1.5 text-xs font-semibold text-[#71837b]">{done} de {plan.sessions_per_week} nesta semana</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Reveal>

        <Reveal index={5} className={card}>
          <h2 className="font-bold">Últimas atividades</h2>
          {logs.length === 0 ? (
            <p className="mt-4 text-sm text-[#71837b]">Suas atividades aparecem aqui.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#edf2ef]">
              <AnimatePresence initial={false}>
                {logs.slice(0, 12).map(log => (
                  <motion.li key={log.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e7f4ec] text-[#087a50]"><HeartPulse size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{log.modality ?? plans?.find(plan => plan.id === log.cardio_plan_id)?.modality ?? "Cardio"}</p>
                      <p className="text-xs text-[#71837b]">
                        {new Date(log.completed_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · {log.duration_minutes} min
                        {log.distance_km ? ` · ${String(log.distance_km).replace(".", ",")} km` : ""}
                        {log.perceived_exertion ? ` · esforço ${log.perceived_exertion}/10` : ""}
                      </p>
                    </div>
                    <button
                      aria-label="Excluir registro"
                      onClick={async () => { const { error } = await deleteCardioLog(log.id); if (!error) setLogs(current => current.filter(item => item.id !== log.id)); }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-[#91a39b] transition hover:bg-[#fdebea] hover:text-[#b94242]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Reveal>
      </div>

      <AnimatePresence>
        {draft && (
          <CardioSheet
            plan={draft.plan}
            onClose={() => setDraft(null)}
            onSave={async input => {
              const { data, error } = await logCardio(viewer.id, input);
              if (error || !data) return "Não foi possível salvar. Tente novamente.";
              setLogs(current => [data, ...current]);
              setDraft(null);
              return null;
            }}
          />
        )}
      </AnimatePresence>
    </Shell>
  );
}

function Tile({ icon: Icon, label, value, suffix = "", decimals = 0, highlight = false }: { icon: typeof Timer; label: string; value: number; suffix?: string; decimals?: number; highlight?: boolean }) {
  return (
    <section className={`${card} h-full ${highlight ? "border-[#f3c969] bg-[#fffaf0]" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[.12em] text-[#71837b]">{label}</p>
        <Icon size={17} className={highlight ? "text-[#d98a00]" : "text-[#087a50]"} />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">
        <AnimatedNumber value={value} format={number => `${number.toFixed(decimals).replace(".", ",")}${suffix}`} />
      </p>
    </section>
  );
}

function CardioSheet({ plan, onClose, onSave }: { plan?: CardioPlan; onClose: () => void; onSave: (input: Parameters<typeof logCardio>[1]) => Promise<string | null> }) {
  const reduceMotion = useReducedMotion();
  const [modality, setModality] = useState(plan?.modality ?? "Corrida");
  const [minutes, setMinutes] = useState(plan ? String(plan.duration_minutes) : "");
  const [distance, setDistance] = useState("");
  const [exertion, setExertion] = useState(6);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const minutesValue = Number(minutes);
    if (!minutesValue || minutesValue < 1 || minutesValue > 600) return setError("Informe a duração em minutos.");
    const distanceValue = distance ? Number(distance.replace(",", ".")) : undefined;
    if (distanceValue !== undefined && (!distanceValue || distanceValue > 500)) return setError("Distância inválida.");
    setSaving(true);
    const message = await onSave({ planId: plan?.id, modality, minutes: minutesValue, distanceKm: distanceValue, exertion, note });
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#07352b]/40 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        onSubmit={submit}
        onClick={event => event.stopPropagation()}
        initial={reduceMotion ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{plan ? plan.title : "Registrar cardio"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f3f8f5]"><X size={18} /></button>
        </div>
        {!plan && (
          <div className="mt-4 flex flex-wrap gap-2">
            {cardioModalities.map(option => (
              <button key={option} type="button" onClick={() => setModality(option)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${modality === option ? "border-[#087a50] bg-[#e7f4ec] text-[#076841]" : "border-[#dbe7e0] text-[#52665e]"}`}>
                {option}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-bold">Duração (min)
            <input value={minutes} onChange={event => setMinutes(event.target.value)} inputMode="numeric" placeholder="30" className={field} />
          </label>
          {distanceModalities.has(modality) && (
            <label className="text-sm font-bold">Distância (km)
              <input value={distance} onChange={event => setDistance(event.target.value)} inputMode="decimal" placeholder="5,0" className={field} />
            </label>
          )}
        </div>
        <label className="mt-4 block text-sm font-bold">
          Esforço percebido: <span className="text-[#087a50]">{exertion}/10</span>
          <input type="range" min={1} max={10} value={exertion} onChange={event => setExertion(Number(event.target.value))} className="mt-3 w-full accent-[#087a50]" />
        </label>
        <label className="mt-4 block text-sm font-bold">Observação
          <input value={note} onChange={event => setNote(event.target.value)} placeholder="Opcional" className={field} />
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-[#b94242]">{error}</p>}
        <Button type="submit" disabled={saving} className="mt-5 w-full">{saving ? "Salvando..." : "Salvar atividade"}</Button>
      </motion.form>
    </motion.div>
  );
}

// Habits ---------------------------------------------------------------------

const habitIcons: Record<HabitKind, typeof Check> = { water: Sparkles, steps: Footprints, sleep: Moon, cardio: HeartPulse, supplement: Pill, custom: Check };
const weekDays = () => Array.from({ length: 7 }, (_, index) => localDate(addDays(index - 6)));

export function HabitsPage({ viewer }: { viewer: Viewer }) {
  const reduceMotion = useReducedMotion();
  const [goals, setGoals] = useState<HabitGoal[] | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const today = localDate();
  const days = useMemo(() => weekDays(), []);

  useEffect(() => {
    let active = true;
    getStudentHabits(viewer.id).then(result => {
      if (!active) return;
      setGoals(result.goals);
      setLogs(result.logs);
    });
    return () => { active = false; };
  }, [viewer.id]);

  const logFor = (goalId: string, day: string) => logs.find(log => log.habit_goal_id === goalId && log.logged_for === day);
  const doneToday = (goals ?? []).filter(goal => logFor(goal.id, today)?.completed).length;
  const weekRate = goals?.length ? logs.filter(log => log.completed && goals.some(goal => goal.id === log.habit_goal_id)).length / (goals.length * 7) : 0;

  async function update(goal: HabitGoal, completed: boolean, value?: number | null) {
    const previous = logs;
    const optimistic: HabitLog = { id: logFor(goal.id, today)?.id ?? `tmp-${goal.id}`, habit_goal_id: goal.id, logged_for: today, completed, value: value ?? null };
    setLogs(current => [...current.filter(log => !(log.habit_goal_id === goal.id && log.logged_for === today)), optimistic]);
    const { data, error } = await setHabitLog(viewer.id, goal.id, { completed, value });
    if (error || !data) return setLogs(previous);
    setLogs(current => [...current.filter(log => !(log.habit_goal_id === goal.id && log.logged_for === today)), data]);
  }

  return (
    <Shell profile="student">
      <PageTitle kicker="HÁBITOS" title="Pequenas vitórias diárias" text="Metas definidas pelo seu profissional para o dia a dia." />
      {goals === null ? (
        <div className="mt-7 h-64 animate-pulse rounded-3xl bg-white soft-shadow" />
      ) : goals.length === 0 ? (
        <section className="mt-7 rounded-3xl border border-dashed border-[#cfe3d8] bg-white p-8 text-center">
          <Sparkles className="mx-auto text-[#9cc7b1]" />
          <h2 className="mt-3 text-lg font-bold">Nenhum hábito definido ainda</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#71837b]">Seu profissional pode definir metas como passos, sono e suplementação. Elas aparecem aqui.</p>
        </section>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Reveal index={0} className={card}>
              <p className="text-[11px] font-bold tracking-[.12em] text-[#71837b]">HOJE</p>
              <p className="mt-2 text-2xl font-bold"><AnimatedNumber value={doneToday} /> de {goals.length}</p>
              <div className="mt-3"><ProgressBar value={doneToday / goals.length} /></div>
            </Reveal>
            <Reveal index={1} className={card}>
              <p className="text-[11px] font-bold tracking-[.12em] text-[#71837b]">ÚLTIMOS 7 DIAS</p>
              <p className="mt-2 text-2xl font-bold"><AnimatedNumber value={weekRate * 100} format={value => `${Math.round(value)}%`} /></p>
              <p className="text-xs text-[#71837b]">de aderência às metas</p>
            </Reveal>
          </div>
          <div className="mt-4 space-y-3">
            {goals.map((goal, index) => {
              const Icon = habitIcons[goal.kind] ?? Check;
              const todayLog = logFor(goal.id, today);
              const done = Boolean(todayLog?.completed);
              return (
                <Reveal key={goal.id} index={index + 2}>
                  <article className={`${card} flex flex-wrap items-center gap-4 transition ${done ? "border-[#bfe4cd] bg-[#f6fcf8]" : ""}`}>
                    <motion.button
                      whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                      onClick={() => update(goal, !done, todayLog?.value)}
                      aria-pressed={done}
                      aria-label={done ? `Desmarcar ${goal.title}` : `Concluir ${goal.title}`}
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition ${done ? "bg-[#087a50] text-white" : "bg-[#e7f4ec] text-[#087a50]"}`}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span key={done ? "done" : "todo"} initial={reduceMotion ? false : { scale: 0.5, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.5 }}>
                          {done ? <Check size={22} /> : <Icon size={20} />}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{goal.title}</p>
                      <p className="text-sm text-[#71837b]">
                        {goal.target_value ? `Meta: ${String(goal.target_value).replace(".", ",")} ${goal.unit ?? ""}` : goal.instructions ?? "Marque quando concluir"}
                      </p>
                    </div>
                    {goal.target_value && (
                      <input
                        inputMode="decimal"
                        defaultValue={todayLog?.value ?? ""}
                        placeholder={goal.unit ?? "valor"}
                        onBlur={event => {
                          const value = event.target.value ? Number(event.target.value.replace(",", ".")) : null;
                          if (value === (todayLog?.value ?? null)) return;
                          update(goal, value !== null && value >= Number(goal.target_value), value);
                        }}
                        className="w-24 rounded-xl border border-[#dbe7e0] px-3 py-2 text-sm outline-none focus:border-[#087a50]"
                      />
                    )}
                    <div className="flex w-full gap-1.5 sm:w-auto">
                      {days.map(day => (
                        <span
                          key={day}
                          title={new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit" })}
                          className={`h-2.5 flex-1 rounded-full sm:w-2.5 sm:flex-none ${logFor(goal.id, day)?.completed ? "bg-[#087a50]" : day === today ? "bg-[#cfe3d8]" : "bg-[#edf2ef]"}`}
                        />
                      ))}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}
