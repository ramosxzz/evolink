"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";
import { CalendarDays, Check, Flame, ListChecks, Medal, MessageSquareText, Plus, Scale, Sparkles, Trash2, Trophy } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { AnimatedNumber } from "@/components/ui/motion";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, localDate } from "@/lib/dates";
import type { Viewer } from "@/lib/evolink-data";
import { bodybuildingCategories, brazilianStates, getEvents, getFederations, type EventSummary, type Federation } from "@/lib/events-data";
import {
  addChecklistItem, addResult, createPrep, defaultPoses, finishPrep, getActivePrep, getResults, placementLabel, posesByCategory, removeChecklistItem, removeResult, setChecklistItem, setTodayPoses,
  type ChecklistItem, type CompetitionResult, type ContestPrep, type PoseLog,
} from "@/lib/prep-data";

const card = "rounded-3xl bg-white p-5 shadow-[var(--card-shadow)] sm:p-6";
const field = "mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--emerald)] focus:ring-4 focus:ring-[var(--ring)]";

type PrepState = Awaited<ReturnType<typeof getActivePrep>>;

export function PrepPage({ viewer }: { viewer: Viewer }) {
  const [state, setState] = useState<PrepState | null>(null);
  const [results, setResults] = useState<CompetitionResult[]>([]);

  async function reload() {
    const [prep, history] = await Promise.all([getActivePrep(viewer.id), getResults(viewer.id)]);
    setState(prep);
    setResults(history);
  }

  useEffect(() => {
    let active = true;
    Promise.all([getActivePrep(viewer.id), getResults(viewer.id)]).then(([prep, history]) => {
      if (!active) return;
      setState(prep);
      setResults(history);
    });
    return () => { active = false; };
  }, [viewer.id]);

  if (!state)
    return (
      <Shell profile="student">
        <div className="space-y-3"><Skeleton className="h-8 w-72 rounded-xl" /><Skeleton className="h-4 w-80 max-w-full rounded-full" /></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><Skeleton className="h-72 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></div>
      </Shell>
    );

  return (
    <Shell profile="student">
      {state.prep ? (
        <PrepDashboard viewer={viewer} state={state} setState={setState} onFinished={reload} />
      ) : (
        <>
          <PageTitle title="Preparação para campeonato" text="Contagem regressiva, peso, checklist e poses até o dia do palco." />
          <CreatePrep viewer={viewer} onCreated={reload} />
        </>
      )}
      <ResultsSection viewer={viewer} results={results} onChange={async () => setResults(await getResults(viewer.id))} />
    </Shell>
  );
}

function phaseFor(daysLeft: number) {
  if (daysLeft <= 0) return { label: "Dia do palco", tone: "bg-[#ffcc33] text-[#4a3700]" };
  if (daysLeft <= 7) return { label: "Semana de pico", tone: "bg-[#ff6a00] text-white" };
  if (daysLeft <= 28) return { label: "Reta final", tone: "bg-[#b8e986] text-[#0d3a2c]" };
  if (daysLeft <= 84) return { label: "Cutting", tone: "bg-white/15 text-white" };
  return { label: "Preparação", tone: "bg-white/15 text-white" };
}

function PrepDashboard({ viewer, state, setState, onFinished }: { viewer: Viewer; state: PrepState; setState: (updater: (current: PrepState | null) => PrepState | null) => void; onFinished: () => void }) {
  const router = useRouter();
  const prep = state.prep as ContestPrep;
  const daysLeft = Math.ceil((new Date(`${prep.stage_date}T12:00:00`).getTime() - new Date(`${localDate()}T12:00:00`).getTime()) / 86_400_000);
  const phase = phaseFor(daysLeft);
  const [confirmFinish, setConfirmFinish] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle title={prep.title} text={`${prep.category ?? "Categoria não definida"} · palco em ${new Date(`${prep.stage_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`} />
        <div className="flex gap-2">
          {prep.event_id && <Button kind="outline" onClick={() => router.push(`/eventos/${prep.event_id}`)}><CalendarDays size={16} />Ver evento</Button>}
          <Button kind="ghost" onClick={() => setConfirmFinish(true)}>Encerrar</Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#07352b] via-[#0a4a35] to-[#087a50] p-6 text-white shadow-[var(--card-shadow)] sm:p-7">
          <Trophy size={180} className="pointer-events-none absolute -bottom-10 -right-8 rotate-12 text-white/[.06]" />
          <span className={`relative inline-flex rounded-full px-3 py-1 text-xs font-bold ${phase.tone}`}>{phase.label}</span>
          <p className="relative mt-5 flex items-baseline gap-3">
            <span className="text-6xl font-bold tracking-tight tabular sm:text-7xl"><AnimatedNumber value={Math.max(0, daysLeft)} /></span>
            <span className="text-lg font-semibold text-emerald-100">{Math.max(0, daysLeft) === 1 ? "dia" : "dias"} para o palco</span>
          </p>
          <p className="relative mt-2 text-sm text-emerald-100">{daysLeft > 7 ? `${Math.floor(daysLeft / 7)} semanas e ${daysLeft % 7} dias` : daysLeft > 0 ? "Última semana: foque no descanso, nas poses e no plano de pico." : "Boa competição! Registre o resultado abaixo."}</p>
        </section>
        <WeightCard prep={prep} weights={state.weights} daysLeft={daysLeft} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Checklist prep={prep} items={state.checklist} onChange={items => setState(current => current && { ...current, checklist: items })} />
        <Poses prep={prep} logs={state.poses} onChange={poses => setState(current => current && { ...current, poses })} />
      </div>

      <section className={`${card} mt-4`}>
        <h2 className="flex items-center gap-2 font-bold"><MessageSquareText size={18} className="text-[var(--emerald)]" />Orientações do treinador</h2>
        <p className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed ${prep.coach_notes ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
          {prep.coach_notes ?? (viewer.counterpart ? `${viewer.counterpart.fullName.split(" ")[0]} pode deixar orientações de pico, poses e pesagem aqui.` : "Vincule um treinador para receber orientações da preparação.")}
        </p>
      </section>

      <Modal open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Encerrar preparação?" description="Ela sai da tela principal. Seu histórico de resultados continua salvo." size="sm"
        footer={<><Button kind="outline" onClick={() => setConfirmFinish(false)}>Cancelar</Button><Button onClick={async () => { await finishPrep(prep.id); setConfirmFinish(false); onFinished(); }}>Encerrar</Button></>}>
        <p className="text-sm text-[var(--muted)]">Depois do campeonato, registre sua colocação no histórico competitivo.</p>
      </Modal>
    </>
  );
}

function WeightCard({ prep, weights, daysLeft }: { prep: ContestPrep; weights: { recorded_on: string; weight_kg: number }[]; daysLeft: number }) {
  const current = weights.at(-1)?.weight_kg;
  const target = prep.target_weight_kg != null ? Number(prep.target_weight_kg) : null;
  const remaining = current !== undefined && target !== null ? current - target : null;
  const weeks = Math.max(1, daysLeft / 7);
  const perWeek = remaining !== null && daysLeft > 0 ? remaining / weeks : null;
  const kg = (value: number) => `${value.toFixed(1).replace(".", ",")} kg`;
  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold"><Scale size={18} className="text-[var(--emerald)]" />Peso de palco</h2>
        {target !== null && <span className="rounded-full bg-[var(--mint)] px-2.5 py-1 text-xs font-semibold text-[var(--emerald)]">Meta {kg(target)}</span>}
      </div>
      {current === undefined ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Registre seu peso em Evolução para acompanhar a meta.</p>
      ) : (
        <>
          <p className="mt-3 text-3xl font-bold tabular"><AnimatedNumber value={current} format={kg} /></p>
          <p className="text-sm text-[var(--muted)]">
            {remaining === null ? "Defina um peso meta." : Math.abs(remaining) < 0.1 ? "Na meta!" : remaining > 0 ? `Faltam ${kg(remaining)}${perWeek !== null ? ` · cerca de ${kg(Math.abs(perWeek))} por semana` : ""}` : `${kg(Math.abs(remaining))} abaixo da meta`}
          </p>
          {weights.length > 1 && (
            <div className="-mx-1 mt-4 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weights}>
                  <defs>
                    <linearGradient id="prepWeight" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#087a50" stopOpacity={0.25} /><stop offset="100%" stopColor="#087a50" stopOpacity={0} /></linearGradient>
                  </defs>
                  <YAxis hide domain={[(min: number) => Math.min(min, target ?? min) - 1, "dataMax + 1"]} />
                  {target !== null && <ReferenceLine y={target} stroke="#d9a300" strokeDasharray="4 4" />}
                  <Area type="monotone" dataKey="weight_kg" stroke="var(--emerald)" strokeWidth={2} fill="url(#prepWeight)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Checklist({ prep, items, onChange }: { prep: ContestPrep; items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
  const reduceMotion = useReducedMotion();
  const [label, setLabel] = useState("");
  const done = items.filter(item => item.done).length;

  async function toggle(item: ChecklistItem) {
    onChange(items.map(entry => (entry.id === item.id ? { ...entry, done: !entry.done } : entry)));
    const { error } = await setChecklistItem(item.id, !item.done);
    if (error) onChange(items);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (label.trim().length < 2) return;
    const { data } = await addChecklistItem(prep.id, label, items.length);
    if (data) onChange([...items, data]);
    setLabel("");
  }

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold"><ListChecks size={18} className="text-[var(--emerald)]" />Checklist do campeonato</h2>
        <span className="text-sm font-semibold text-[var(--muted)] tabular">{done}/{items.length}</span>
      </div>
      <ul className="mt-4 space-y-1">
        <AnimatePresence initial={false}>
          {items.map(item => (
            <motion.li key={item.id} layout exit={{ opacity: 0, height: 0 }} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#f6f9f7]">
              <motion.button whileTap={reduceMotion ? undefined : { scale: 0.85 }} onClick={() => toggle(item)} aria-pressed={item.done} aria-label={item.label} className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors ${item.done ? "border-[var(--emerald)] bg-[var(--emerald)] text-white" : "border-[#c7d9cf]"}`}>
                {item.done && <Check size={14} strokeWidth={3} />}
              </motion.button>
              <span className={`flex-1 text-sm ${item.done ? "text-[var(--muted)] line-through" : ""}`}>{item.label}</span>
              <button onClick={async () => { const { error } = await removeChecklistItem(item.id); if (!error) onChange(items.filter(entry => entry.id !== item.id)); }} aria-label={`Remover ${item.label}`} className="rounded-lg p-1 text-[#b3c2bb] opacity-0 transition hover:text-[#b94242] group-hover:opacity-100 focus:opacity-100">
                <Trash2 size={14} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input value={label} onChange={event => setLabel(event.target.value)} placeholder="Adicionar item" maxLength={120} className="flex-1 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--emerald)] focus:ring-4 focus:ring-[var(--ring)]" />
        <Button type="submit" kind="soft" className="px-3"><Plus size={16} /></Button>
      </form>
    </section>
  );
}

function Poses({ prep, logs, onChange }: { prep: ContestPrep; logs: PoseLog[]; onChange: (logs: PoseLog[]) => void }) {
  const reduceMotion = useReducedMotion();
  const today = localDate();
  const poses = posesByCategory[prep.category ?? ""] ?? defaultPoses;
  const todayLog = logs.find(log => log.practiced_on === today);
  const practiced = new Set(todayLog?.poses ?? []);
  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => localDate(addDays(index - 13))), []);
  const practicedDays = new Set(logs.filter(log => log.poses.length).map(log => log.practiced_on));
  let streak = 0;
  for (let cursor = practicedDays.has(today) ? new Date() : addDays(-1); practicedDays.has(localDate(cursor)); cursor = addDays(-1, cursor)) streak++;

  async function toggle(pose: string) {
    const next = practiced.has(pose) ? [...practiced].filter(item => item !== pose) : [...practiced, pose];
    const previous = logs;
    onChange([...logs.filter(log => log.practiced_on !== today), ...(next.length ? [{ practiced_on: today, poses: next }] : [])]);
    const { error } = await setTodayPoses(prep.id, next);
    if (error) onChange(previous);
  }

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold"><Sparkles size={18} className="text-[var(--emerald)]" />Treino de poses hoje</h2>
        <span className={`flex items-center gap-1 text-sm font-bold ${streak >= 3 ? "text-[#d98a00]" : "text-[var(--muted)]"}`}><Flame size={15} />{streak} {streak === 1 ? "dia" : "dias"}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {poses.map(pose => {
          const done = practiced.has(pose);
          return (
            <motion.button key={pose} whileTap={reduceMotion ? undefined : { scale: 0.96 }} onClick={() => toggle(pose)} aria-pressed={done} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${done ? "border-[var(--emerald)] bg-[var(--mint)] text-[var(--emerald-dark)]" : "border-[var(--line)] hover:border-[#c7d9cf]"}`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? "bg-[var(--emerald)] text-white" : "border border-[#c7d9cf]"}`}>{done && <Check size={12} strokeWidth={3} />}</span>
              {pose}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold text-[var(--muted)]">Últimos 14 dias</p>
        <div className="mt-2 flex gap-1">
          {days.map(day => <span key={day} title={new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR")} className={`h-2.5 flex-1 rounded-full ${practicedDays.has(day) ? "bg-[var(--emerald)]" : day === today ? "bg-[#cfe3d8]" : "bg-[#edf2ef]"}`} />)}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[#8a9c94]">As poses obrigatórias podem variar por federação. Confirme no regulamento do evento.</p>
    </section>
  );
}

function CreatePrep({ viewer, onCreated }: { viewer: Viewer; onCreated: () => void }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [stageDate, setStageDate] = useState(localDate(addDays(84)));
  const [category, setCategory] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getEvents(viewer.id, { period: "upcoming" }).then(result => { if (active) setEvents(result.events); });
    return () => { active = false; };
  }, [viewer.id]);

  function chooseEvent(id: string) {
    setEventId(id);
    const event = events.find(item => item.id === id);
    if (event) { setTitle(event.title); setStageDate(event.startsOn); }
  }

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (title.trim().length < 3) return setError("Dê um nome à preparação.");
    const targetValue = target ? Number(target.replace(",", ".")) : undefined;
    if (targetValue !== undefined && !(targetValue >= 30 && targetValue <= 250)) return setError("Peso meta inválido.");
    setSaving(true);
    const { error: saveError } = await createPrep(viewer.id, { title, stageDate, category, targetWeight: targetValue, eventId });
    setSaving(false);
    if (saveError) return setError("Não foi possível criar.");
    onCreated();
  }

  return (
    <form onSubmit={submit} className={`${card} mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]`}>
      <div className="lg:col-span-2">
        <h2 className="flex items-center gap-2 font-bold"><Trophy size={18} className="text-[var(--emerald)]" />Começar uma preparação</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Escolha um campeonato do calendário ou informe outro.</p>
      </div>
      <Select label="Campeonato do calendário" value={eventId} onChange={chooseEvent} placeholder={events.length ? "Escolher evento" : "Nenhum evento próximo"} disabled={!events.length} options={events.map(event => ({ value: event.id, label: event.title, hint: `${new Date(`${event.startsOn}T12:00:00`).toLocaleDateString("pt-BR")} · ${event.city}/${event.state}` }))} />
      <label className="block text-sm font-bold">Nome<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Gaúcho 2027" className={field} /></label>
      <label className="block text-sm font-bold">Data do palco<input type="date" value={stageDate} onChange={event => setStageDate(event.target.value)} className={field} /></label>
      <Select label="Categoria" value={category} onChange={setCategory} options={bodybuildingCategories.map(item => ({ value: item, label: item }))} />
      <label className="block text-sm font-bold">Peso meta de palco (kg)<input value={target} onChange={event => setTarget(event.target.value)} inputMode="decimal" placeholder="Opcional" className={field} /></label>
      <div className="flex flex-col justify-end">
        {error && <p className="mb-2 text-sm font-semibold text-[#b94242]">{error}</p>}
        <Button type="submit" disabled={saving} className="w-full py-3">{saving ? "Criando..." : "Começar preparação"}</Button>
      </div>
    </form>
  );
}

function ResultsSection({ viewer, results, onChange }: { viewer: Viewer; results: CompetitionResult[]; onChange: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <section className={`${card} mt-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold"><Medal size={18} className="text-[var(--emerald)]" />Histórico competitivo</h2>
        <div className="flex gap-2">
          <Button kind="outline" onClick={() => router.push("/ranking")} className="px-3 py-2 text-xs"><Trophy size={14} />Ranking</Button>
          <Button kind="soft" onClick={() => setOpen(true)} className="px-3 py-2 text-xs"><Plus size={14} />Registrar resultado</Button>
        </div>
      </div>
      {results.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Seus campeonatos e colocações aparecem aqui e no seu perfil público.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#f0f4f2]">
          {results.map(result => (
            <li key={result.id} className="group flex items-center gap-3 py-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${result.placement === 1 || result.is_overall ? "bg-[#fff1b8] text-[#8a6d00]" : result.placement && result.placement <= 3 ? "bg-[#eef1f4] text-[#5a6671]" : "bg-[#f3f7f5] text-[var(--muted)]"}`}>{result.is_overall ? <Trophy size={16} /> : result.placement ? `${result.placement}º` : "-"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{result.event_name}</span>
                <span className="block text-xs text-[var(--muted)]">{placementLabel(result)} · {result.category} · {new Date(`${result.competed_on}T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
              </span>
              <button onClick={async () => { const { error } = await removeResult(result.id); if (!error) onChange(); }} aria-label="Remover resultado" className="rounded-lg p-1.5 text-[#b3c2bb] opacity-0 transition hover:text-[#b94242] group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <ResultModal open={open} onClose={() => setOpen(false)} viewer={viewer} onSaved={() => { setOpen(false); onChange(); }} />
    </section>
  );
}

function ResultModal({ open, onClose, viewer, onSaved }: { open: boolean; onClose: () => void; viewer: Viewer; onSaved: () => void }) {
  const [federations, setFederations] = useState<Federation[]>([]);
  const [pastEvents, setPastEvents] = useState<EventSummary[]>([]);
  const [values, setValues] = useState({ eventId: "", eventName: "", federationCode: "ifbb_brasil", competedOn: localDate(), state: "RS", category: "", placement: "", overall: false });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    Promise.all([getFederations(), getEvents(viewer.id, { period: "past" })]).then(([rows, past]) => { if (active) { setFederations(rows); setPastEvents(past.events); } });
    return () => { active = false; };
  }, [open, viewer.id]);

  function chooseEvent(id: string) {
    const event = pastEvents.find(item => item.id === id);
    setValues(current => ({ ...current, eventId: id, ...(event ? { eventName: event.title, federationCode: event.federationCode, competedOn: event.startsOn, state: event.state } : {}) }));
  }

  async function save() {
    if (values.eventName.trim().length < 3) return setError("Informe o campeonato.");
    if (!values.category) return setError("Escolha a categoria.");
    const placement = values.placement ? Number(values.placement) : null;
    if (placement !== null && !(placement >= 1 && placement <= 99)) return setError("Colocação inválida.");
    setSaving(true);
    const { error: saveError } = await addResult(viewer.id, { ...values, placement, isOverall: values.overall });
    setSaving(false);
    if (saveError) return setError("Não foi possível salvar.");
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar resultado" description="Aparece no seu perfil e conta pontos no ranking do ano."
      footer={<><Button kind="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {pastEvents.length > 0 && <div className="sm:col-span-2"><Select label="Evento do calendário (opcional)" value={values.eventId} onChange={chooseEvent} placeholder="Escolher evento" options={pastEvents.map(event => ({ value: event.id, label: event.title, hint: new Date(`${event.startsOn}T12:00:00`).toLocaleDateString("pt-BR") }))} /></div>}
        <label className="block text-sm font-bold sm:col-span-2">Campeonato<input value={values.eventName} onChange={event => setValues({ ...values, eventName: event.target.value })} className={field} /></label>
        <Select label="Federação" value={values.federationCode} onChange={federationCode => setValues({ ...values, federationCode })} options={federations.map(item => ({ value: item.code, label: item.name }))} />
        <label className="block text-sm font-bold">Data<input type="date" value={values.competedOn} onChange={event => setValues({ ...values, competedOn: event.target.value })} className={field} /></label>
        <Select label="Categoria" value={values.category} onChange={category => setValues({ ...values, category })} options={bodybuildingCategories.map(item => ({ value: item, label: item }))} />
        <Select label="UF" value={values.state} onChange={state => setValues({ ...values, state })} options={brazilianStates.map(uf => ({ value: uf, label: uf }))} />
        <label className="block text-sm font-bold">Colocação<input value={values.placement} onChange={event => setValues({ ...values, placement: event.target.value })} inputMode="numeric" placeholder="Em branco = participação" className={field} /></label>
        <label className="flex items-center gap-2 self-end rounded-xl bg-[#f6f9f7] px-4 py-3 text-sm font-semibold">
          <input type="checkbox" checked={values.overall} onChange={event => setValues({ ...values, overall: event.target.checked })} className="h-4 w-4 accent-[var(--emerald)]" />Campeão overall
        </label>
      </div>
      {error && <p className="mt-4 text-sm font-semibold text-[#b94242]">{error}</p>}
    </Modal>
  );
}
