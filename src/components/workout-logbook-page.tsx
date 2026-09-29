"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  ChevronDown,
  Clock3,
  Download,
  Dumbbell,
  Flame,
  Heart,
  LockKeyhole,
  Medal,
  Play,
  RotateCcw,
  Share2,
  SkipForward,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/evolink-app";
import type { Viewer } from "@/lib/evolink-data";
import {
  completeWorkout,
  getCommunityFeed,
  getLogbook,
  removeWorkoutSet,
  saveWorkoutSet,
  startWorkout,
  togglePostLike,
  type CommunityPost,
  type LogbookExercise,
  type WorkoutSession,
  type WorkoutSetLog,
} from "@/lib/logbook-data";

type SetDraft = {
  load: string;
  reps: string;
  rir: string;
  type: WorkoutSetLog["set_type"];
  completed: boolean;
  saving: boolean;
  isPr: boolean;
};

type CompletedSummary = {
  title: string;
  duration: number;
  volume: number;
  sets: number;
  prs: number;
};

const setLabels: Record<WorkoutSetLog["set_type"], string> = {
  warmup: "Aquecimento",
  working: "Trabalho",
  drop: "Drop-set",
  failure: "Falha",
};

function setKey(exerciseId: string, setNumber: number) {
  return `${exerciseId}:${setNumber}`;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatVolume(value: number) {
  return value >= 1000
    ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value / 1000)} t`
    : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)} kg`;
}

export function WorkoutLogbookPage({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [plan, setPlan] = useState<{ id: string; title: string; objective: string | null; estimatedMinutes: number | null } | null>(null);
  const [exercises, setExercises] = useState<LogbookExercise[]>([]);
  const [history, setHistory] = useState<WorkoutSetLog[]>([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [finishOpen, setFinishOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [publish, setPublish] = useState(true);
  const [visibility, setVisibility] = useState<"coach" | "community">("coach");
  const [finishing, setFinishing] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<CompletedSummary | null>(null);

  function hydrateDrafts(items: LogbookExercise[], activeSets: WorkoutSetLog[], historical: WorkoutSetLog[]) {
    const next: Record<string, SetDraft> = {};
    for (const exercise of items) {
      const count = Math.max(1, exercise.sets ?? 3);
      for (let number = 1; number <= count; number += 1) {
        const active = activeSets.find((entry) => entry.workout_exercise_id === exercise.id && entry.set_number === number);
        const previous = historical.find((entry) => entry.workout_exercise_id === exercise.id && entry.set_number === number);
        next[setKey(exercise.id, number)] = {
          load: active?.load_kg != null ? String(active.load_kg) : previous?.load_kg != null ? String(previous.load_kg) : "",
          reps: active?.repetitions_completed != null ? String(active.repetitions_completed) : "",
          rir: active?.rir != null ? String(active.rir) : exercise.target_rir != null ? String(exercise.target_rir) : "",
          type: active?.set_type ?? "working",
          completed: Boolean(active),
          saving: false,
          isPr: active?.is_personal_record ?? false,
        };
      }
    }
    setDrafts(next);
    setExpanded(Object.fromEntries(items.map((exercise, index) => [exercise.id, index === 0 || activeSets.some((entry) => entry.workout_exercise_id === exercise.id)])));
  }

  async function load() {
    setLoading(true);
    setLoadError("");
    const result = await getLogbook(viewer.id);
    setLoading(false);
    if (result.error) {
      setLoadError(result.error.message);
      return;
    }
    setPlan(result.plan);
    setExercises(result.exercises);
    setHistory(result.history);
    setSession(result.session);
    hydrateDrafts(result.exercises, result.activeSets, result.history);
  }

  useEffect(() => {
    let active = true;
    getLogbook(viewer.id).then((result) => {
      if (!active) return;
      setLoading(false);
      if (result.error) {
        setLoadError(result.error.message);
        return;
      }
      setPlan(result.plan);
      setExercises(result.exercises);
      setHistory(result.history);
      setSession(result.session);
      hydrateDrafts(result.exercises, result.activeSets, result.history);
    });
    return () => { active = false; };
  }, [viewer.id]);
  useEffect(() => {
    if (!session) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session]);
  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(() => setRestSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  const completedDrafts = useMemo(() => Object.values(drafts).filter((draft) => draft.completed), [drafts]);
  const totals = useMemo(() => {
    const working = completedDrafts.filter((draft) => draft.type !== "warmup");
    return {
      sets: completedDrafts.length,
      volume: working.reduce((total, draft) => total + (Number(draft.load.replace(",", ".")) || 0) * (Number(draft.reps) || 0), 0),
      prs: completedDrafts.filter((draft) => draft.isPr).length,
    };
  }, [completedDrafts]);

  function updateDraft(key: string, values: Partial<SetDraft>) {
    setDrafts((current) => ({ ...current, [key]: { ...current[key], ...values } }));
  }

  async function begin() {
    if (!plan || starting) return;
    setStarting(true);
    setMessage("");
    const { data, error } = await startWorkout(viewer.id, plan.id);
    setStarting(false);
    if (error || !data) {
      setMessage(error?.message ?? "Não foi possível iniciar o treino.");
      return;
    }
    setSession(data as WorkoutSession);
    setElapsed(0);
  }

  function previousFor(exerciseId: string, setNumber: number) {
    return history.find((entry) => entry.workout_exercise_id === exerciseId && entry.set_number === setNumber);
  }

  function isNewRecord(exerciseId: string, load: number, reps: number, type: WorkoutSetLog["set_type"]) {
    if (type === "warmup") return false;
    const prior = history.filter((entry) => entry.workout_exercise_id === exerciseId && entry.set_type !== "warmup");
    if (!prior.length) return false;
    const bestLoad = Math.max(...prior.map((entry) => Number(entry.load_kg ?? 0)));
    const bestRepsAtLoad = Math.max(0, ...prior.filter((entry) => Number(entry.load_kg ?? 0) === load).map((entry) => entry.repetitions_completed ?? 0));
    return load > bestLoad || (load === bestLoad && reps > bestRepsAtLoad);
  }

  async function toggleSet(exercise: LogbookExercise, setNumber: number) {
    if (!session) return;
    const key = setKey(exercise.id, setNumber);
    const draft = drafts[key];
    if (draft.completed) {
      updateDraft(key, { saving: true });
      const { error } = await removeWorkoutSet(session.id, exercise.id, setNumber);
      updateDraft(key, { saving: false, completed: error ? true : false, isPr: error ? draft.isPr : false });
      if (error) setMessage(error.message);
      return;
    }
    const repetitions = Number(draft.reps);
    const loadKg = Number(draft.load.replace(",", "."));
    if (!Number.isFinite(repetitions) || repetitions < 1 || !Number.isFinite(loadKg) || loadKg < 0) {
      setMessage("Preencha carga e repetições antes de concluir a série.");
      return;
    }
    updateDraft(key, { saving: true });
    const isPr = isNewRecord(exercise.id, loadKg, repetitions, draft.type);
    const { error } = await saveWorkoutSet({
      studentId: viewer.id,
      sessionId: session.id,
      exerciseId: exercise.id,
      setNumber,
      repetitions,
      loadKg,
      rir: draft.rir === "" ? null : Number(draft.rir),
      setType: draft.type,
      restSeconds: exercise.rest_seconds ?? 60,
      isPersonalRecord: isPr,
    });
    updateDraft(key, { saving: false, completed: !error, isPr: !error && isPr });
    if (error) {
      setMessage(error.message);
      return;
    }
    const rest = exercise.rest_seconds ?? 60;
    setRestTotal(rest);
    setRestSeconds(rest);
    setMessage(isPr ? "Novo recorde pessoal registrado." : `Série ${setNumber} concluída.`);
  }

  async function finishWorkout() {
    if (!session || !plan || totals.sets === 0) return;
    setFinishing(true);
    setMessage("");
    const exerciseSummary = exercises.map((exercise) => {
      const entries = Array.from({ length: Math.max(1, exercise.sets ?? 3) }, (_, index) => drafts[setKey(exercise.id, index + 1)]).filter((draft) => draft?.completed);
      return { name: exercise.name, sets: entries.length, bestLoad: Math.max(0, ...entries.map((entry) => Number(entry.load.replace(",", ".")) || 0)) };
    }).filter((entry) => entry.sets > 0);
    const response = await completeWorkout({
      viewer,
      session,
      workoutTitle: plan.title,
      durationSeconds: elapsed,
      totalVolumeKg: totals.volume,
      totalSets: totals.sets,
      prCount: totals.prs,
      publish,
      visibility,
      caption,
      exerciseSummary,
    });
    setFinishing(false);
    if (response.error) {
      setMessage(response.error.message);
      return;
    }
    setFinishOpen(false);
    setSummary({ title: plan.title, duration: elapsed, volume: totals.volume, sets: totals.sets, prs: totals.prs });
    setSession(null);
    if (response.postError) setMessage("Treino salvo, mas a publicação não foi criada. Você pode compartilhar o card normalmente.");
  }

  async function createShareFile() {
    if (!summary) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const gradient = context.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, "#07352b");
    gradient.addColorStop(1, "#087a50");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1350);
    context.fillStyle = "#b8e986";
    context.beginPath();
    context.arc(900, 130, 260, 0, Math.PI * 2);
    context.globalAlpha = 0.12;
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = "#ffffff";
    context.font = "900 70px Arial";
    context.fillText("evolink", 92, 140);
    context.fillStyle = "#b8e986";
    context.font = "700 30px Arial";
    context.fillText("TREINO CONCLUÍDO", 92, 270);
    context.fillStyle = "#ffffff";
    context.font = "900 76px Arial";
    wrapCanvasText(context, summary.title, 92, 370, 860, 90);
    const stats = [
      [formatDuration(summary.duration), "TEMPO"],
      [String(summary.sets), "SÉRIES"],
      [formatVolume(summary.volume), "VOLUME"],
      [String(summary.prs), "RECORDES"],
    ];
    stats.forEach(([value, label], index) => {
      const x = 92 + (index % 2) * 470;
      const y = 720 + Math.floor(index / 2) * 230;
      context.fillStyle = "rgba(255,255,255,.10)";
      roundedRect(context, x, y, 410, 180, 30);
      context.fill();
      context.fillStyle = "#ffffff";
      context.font = "900 58px Arial";
      context.fillText(value, x + 34, y + 80);
      context.fillStyle = "#b8e986";
      context.font = "700 24px Arial";
      context.fillText(label, x + 34, y + 130);
    });
    context.fillStyle = "rgba(255,255,255,.72)";
    context.font = "500 27px Arial";
    context.fillText("Consistência vira resultado.", 92, 1260);
    return new Promise<File | null>((resolve) => canvas.toBlob((blob) => resolve(blob ? new File([blob], "treino-evolink.png", { type: "image/png" }) : null), "image/png"));
  }

  async function downloadCard() {
    const file = await createShareFile();
    if (!file) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function shareCard() {
    const file = await createShareFile();
    if (!summary || !file) return;
    const shareData = { title: "Treino concluído no Evolink", text: `${summary.title}: ${summary.sets} séries e ${formatVolume(summary.volume)} de volume.`, files: [file] };
    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      await navigator.share(shareData).catch(() => undefined);
      return;
    }
    await downloadCard();
    setMessage("Card baixado. Agora você pode publicar onde quiser.");
  }

  if (summary) {
    return <Shell profile="student"><section className="mx-auto max-w-3xl py-4 text-center"><motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[2rem] bg-[#07352b] p-6 text-white shadow-2xl shadow-emerald-950/15 md:p-10"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#b8e986] text-[#174237]"><Trophy size={30} /></span><p className="mt-6 text-xs font-bold tracking-[.18em] text-[#b8e986]">TREINO CONCLUÍDO</p><h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{summary.title}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-emerald-100">Seu treino foi salvo no histórico. Cada série registrada ajuda seu profissional a ajustar o próximo passo.</p><div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4"><ResultStat label="Tempo" value={formatDuration(summary.duration)} /><ResultStat label="Séries" value={String(summary.sets)} /><ResultStat label="Volume" value={formatVolume(summary.volume)} /><ResultStat label="Recordes" value={String(summary.prs)} /></div><div className="mt-8 grid gap-3 sm:grid-cols-2"><Button onClick={() => void shareCard()} className="bg-[#b8e986] text-[#174237] hover:bg-[#c8f49d]"><Share2 size={17} /> Compartilhar resultado</Button><Button onClick={() => void downloadCard()} kind="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15"><Download size={17} /> Baixar card</Button></div></motion.div><div className="mt-4 flex flex-wrap justify-center gap-3"><Button kind="soft" onClick={() => router.push("/aluno/comunidade")}><Users size={17} /> Ver comunidade</Button><Button kind="outline" onClick={() => { setSummary(null); void load(); }}><RotateCcw size={17} /> Voltar aos treinos</Button></div>{message && <p className="mt-4 text-sm font-semibold text-[#087a50]">{message}</p>}</section></Shell>;
  }

  return <Shell profile="student"><PageTitle kicker="LOGBOOK" title={session ? plan?.title ?? "Treino em andamento" : "Seu treino de hoje"} text={session ? "Registre cada série. O descanso começa automaticamente." : "Carga, repetições e evolução no mesmo lugar."} />
    {loading ? <LoadingState /> : loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : !plan || exercises.length === 0 ? <EmptyWorkout /> : !session ? <WorkoutIntro plan={plan} exercises={exercises} starting={starting} onStart={() => void begin()} /> : <>
      <section className="sticky top-[76px] z-[8] mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-[#dbe7e0] bg-white/95 p-2 shadow-lg shadow-emerald-950/5 backdrop-blur md:grid-cols-4"><MiniStat icon={Clock3} label="Tempo" value={formatDuration(elapsed)} /><MiniStat icon={Dumbbell} label="Séries" value={String(totals.sets)} /><MiniStat icon={Flame} label="Volume" value={formatVolume(totals.volume)} /><MiniStat icon={Medal} label="Recordes" value={String(totals.prs)} className="hidden md:flex" /></section>
      <div className="mt-5 space-y-4">{exercises.map((exercise, exerciseIndex) => {
        const count = Math.max(1, exercise.sets ?? 3);
        const completed = Array.from({ length: count }, (_, index) => drafts[setKey(exercise.id, index + 1)]?.completed).filter(Boolean).length;
        return <motion.article layout key={exercise.id} className="overflow-hidden rounded-3xl border border-[#e2ece6] bg-white soft-shadow"><button aria-expanded={expanded[exercise.id]} onClick={() => setExpanded((current) => ({ ...current, [exercise.id]: !current[exercise.id] }))} className="flex w-full items-center gap-4 p-5 text-left"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${completed === count ? "bg-[#087a50] text-white" : "bg-[#e7f4ec] text-[#087a50]"}`}>{completed === count ? <Check size={22} /> : <span className="text-sm font-black">{exerciseIndex + 1}</span>}</span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{exercise.name}</span><span className="mt-1 block text-xs text-[#71837b]">{count} séries, {exercise.repetitions ?? "repetições livres"}{exercise.technique ? `, ${exercise.technique}` : ""}</span></span><span className="text-xs font-bold text-[#087a50]">{completed}/{count}</span><ChevronDown size={18} className={`text-[#71837b] transition-transform ${expanded[exercise.id] ? "rotate-180" : ""}`} /></button><AnimatePresence initial={false}>{expanded[exercise.id] && <motion.div initial={reduceMotion ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduceMotion ? undefined : { height: 0, opacity: 0 }} className="overflow-hidden"><div className="border-t border-[#edf2ef] p-4 md:p-5">{(exercise.notes || exercise.target_rir != null || exercise.video_url) && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-[#f3f8f5] p-3 text-xs text-[#52665e]">{exercise.notes && <span className="font-semibold">{exercise.notes}</span>}{exercise.target_rir != null && <span className="rounded-full bg-white px-2.5 py-1 font-bold">Alvo RIR {exercise.target_rir}</span>}{exercise.video_url && <a href={exercise.video_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-bold text-[#087a50]"><Play size={13} /> Ver execução</a>}</div>}<div className="overflow-x-auto"><div className="min-w-[660px]"><div className="grid grid-cols-[44px_1fr_1fr_90px_128px_48px] gap-2 px-1 text-[10px] font-bold tracking-[.08em] text-[#91a39b]"><span>SÉRIE</span><span>CARGA KG</span><span>REPS</span><span>RIR</span><span>TIPO</span><span>OK</span></div><div className="mt-2 space-y-2">{Array.from({ length: count }, (_, index) => {
                          const number = index + 1;
                          const key = setKey(exercise.id, number);
                          const draft = drafts[key];
                          const previous = previousFor(exercise.id, number);
                          if (!draft) return null;
                          return <div key={key} className={`grid grid-cols-[44px_1fr_1fr_90px_128px_48px] items-center gap-2 rounded-xl p-1.5 ${draft.completed ? "bg-[#eff9f3]" : "bg-[#f8fbf9]"}`}><span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-black text-[#456158]">{number}</span><label><span className="sr-only">Carga da série {number}</span><input aria-label={`Carga da série ${number}`} disabled={draft.completed || draft.saving} value={draft.load} onChange={(event) => updateDraft(key, { load: event.target.value })} inputMode="decimal" placeholder={previous?.load_kg != null ? String(previous.load_kg) : "0"} className="w-full rounded-lg border border-[#dbe7e0] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#087a50]" /></label><label><span className="sr-only">Repetições da série {number}</span><input aria-label={`Repetições da série ${number}`} disabled={draft.completed || draft.saving} value={draft.reps} onChange={(event) => updateDraft(key, { reps: event.target.value })} inputMode="numeric" placeholder={previous?.repetitions_completed != null ? String(previous.repetitions_completed) : exercise.repetitions ?? "12"} className="w-full rounded-lg border border-[#dbe7e0] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#087a50]" /></label><label><span className="sr-only">RIR da série {number}</span><input aria-label={`RIR da série ${number}`} disabled={draft.completed || draft.saving} value={draft.rir} onChange={(event) => updateDraft(key, { rir: event.target.value })} inputMode="decimal" placeholder="2" className="w-full rounded-lg border border-[#dbe7e0] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#087a50]" /></label><label><span className="sr-only">Tipo da série {number}</span><select aria-label={`Tipo da série ${number}`} disabled={draft.completed || draft.saving} value={draft.type} onChange={(event) => updateDraft(key, { type: event.target.value as WorkoutSetLog["set_type"] })} className="w-full rounded-lg border border-[#dbe7e0] bg-white px-2 py-2 text-xs font-bold outline-none focus:border-[#087a50]">{Object.entries(setLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button aria-label={draft.completed ? `Desmarcar série ${number}` : `Concluir série ${number}`} disabled={draft.saving} onClick={() => void toggleSet(exercise, number)} className={`grid h-10 w-10 place-items-center rounded-xl border-2 transition active:scale-95 ${draft.completed ? "border-[#087a50] bg-[#087a50] text-white" : "border-[#c8d9d0] bg-white text-transparent hover:border-[#087a50]"}`}>{draft.saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Check size={18} />}</button>{draft.isPr && <span className="col-start-2 col-span-5 flex items-center gap-1 text-[11px] font-bold text-[#a97000]"><Sparkles size={12} /> Novo recorde pessoal</span>}{previous && !draft.completed && <span className="col-start-2 col-span-5 text-[11px] text-[#91a39b]">Anterior: {previous.load_kg ?? 0} kg x {previous.repetitions_completed ?? 0} reps{previous.rir != null ? `, RIR ${previous.rir}` : ""}</span>}</div>;
                        })}</div></div></div></div></motion.div>}</AnimatePresence></motion.article>;
      })}</div><Button disabled={totals.sets === 0} onClick={() => setFinishOpen(true)} className="mt-6 w-full py-4 text-base"><Trophy size={18} /> Concluir treino</Button>
    </>}
    {message && <div role="status" className="fixed bottom-24 left-1/2 z-40 w-[min(92vw,32rem)] -translate-x-1/2 rounded-2xl bg-[#173f34] px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">{message}</div>}
    <AnimatePresence>{restSeconds > 0 && <RestTimer seconds={restSeconds} total={restTotal} onAdd={() => { setRestSeconds((value) => value + 30); setRestTotal((value) => value + 30); }} onSkip={() => setRestSeconds(0)} />}</AnimatePresence>
    <AnimatePresence>{finishOpen && <FinishDialog totals={totals} caption={caption} setCaption={setCaption} publish={publish} setPublish={setPublish} visibility={visibility} setVisibility={setVisibility} saving={finishing} onClose={() => setFinishOpen(false)} onFinish={() => void finishWorkout()} />}</AnimatePresence>
  </Shell>;
}

function WorkoutIntro({ plan, exercises, starting, onStart }: { plan: { title: string; objective: string | null; estimatedMinutes: number | null }; exercises: LogbookExercise[]; starting: boolean; onStart: () => void }) {
  return <section className="mt-7 overflow-hidden rounded-[2rem] bg-[#07352b] text-white shadow-xl shadow-emerald-950/10"><div className="p-6 md:p-9"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#b8e986]"><Flame size={14} /> TREINO PROGRAMADO</span><h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">{plan.title}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-100">{plan.objective || "Execute cada série com controle e registre seus números para acompanhar sua evolução."}</p><div className="mt-7 flex flex-wrap gap-3"><span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">{exercises.length} exercícios</span><span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">{plan.estimatedMinutes ?? 45} minutos</span><span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">Descanso automático</span></div><Button disabled={starting} onClick={onStart} className="mt-8 w-full bg-[#b8e986] py-4 text-base text-[#174237] hover:bg-[#c8f49d] sm:w-auto"><Play size={18} fill="currentColor" /> {starting ? "Iniciando..." : "Iniciar treino"}</Button></div><div className="grid grid-cols-3 border-t border-white/10 bg-black/10 px-5 py-4 text-center text-xs text-emerald-100"><span>Histórico de cargas</span><span>RIR por série</span><span>Recordes pessoais</span></div></section>;
}

function MiniStat({ icon: Icon, label, value, className = "" }: { icon: typeof Clock3; label: string; value: string; className?: string }) {
  return <div className={`flex items-center gap-2 rounded-xl px-2 py-2 ${className}`}><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7f4ec] text-[#087a50]"><Icon size={15} /></span><span><span className="block text-[10px] font-bold text-[#91a39b]">{label.toUpperCase()}</span><b className="block text-sm text-[#274c41]">{value}</b></span></div>;
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-4"><p className="text-xl font-black md:text-2xl">{value}</p><p className="mt-1 text-[10px] font-bold tracking-[.1em] text-[#b8e986]">{label.toUpperCase()}</p></div>;
}

function RestTimer({ seconds, total, onAdd, onSkip }: { seconds: number; total: number; onAdd: () => void; onSkip: () => void }) {
  const progress = total > 0 ? Math.min(100, (seconds / total) * 100) : 0;
  return <motion.aside initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} className="fixed bottom-20 left-3 right-3 z-40 mx-auto max-w-xl overflow-hidden rounded-2xl bg-[#173f34] text-white shadow-2xl lg:bottom-5"><div className="h-1 bg-white/15"><motion.div className="h-full bg-[#b8e986]" animate={{ width: `${progress}%` }} /></div><div className="flex items-center gap-3 p-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Clock3 size={20} /></span><span className="flex-1"><span className="block text-[10px] font-bold tracking-[.12em] text-[#b8e986]">DESCANSO</span><b className="text-xl tabular-nums">{formatDuration(seconds)}</b></span><button onClick={onAdd} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15">+ 30 s</button><button aria-label="Pular descanso" onClick={onSkip} className="grid h-10 w-10 place-items-center rounded-xl bg-[#b8e986] text-[#174237]"><SkipForward size={18} /></button></div></motion.aside>;
}

function FinishDialog({ totals, caption, setCaption, publish, setPublish, visibility, setVisibility, saving, onClose, onFinish }: { totals: { sets: number; volume: number; prs: number }; caption: string; setCaption: (value: string) => void; publish: boolean; setPublish: (value: boolean) => void; visibility: "coach" | "community"; setVisibility: (value: "coach" | "community") => void; saving: boolean; onClose: () => void; onFinish: () => void }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-end bg-[#061d19]/55 p-0 sm:place-items-center sm:p-5" onClick={onClose}><motion.section role="dialog" aria-modal="true" aria-labelledby="finish-title" initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} onClick={(event) => event.stopPropagation()} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-[2rem] sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold tracking-[.14em] text-[#087a50]">FECHAR LOGBOOK</p><h2 id="finish-title" className="mt-1 text-2xl font-black">Concluir treino?</h2></div><button aria-label="Fechar" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#eef4f0] text-[#52665e]"><X size={17} /></button></div><div className="mt-5 grid grid-cols-3 gap-2"><ResultBox label="Séries" value={String(totals.sets)} /><ResultBox label="Volume" value={formatVolume(totals.volume)} /><ResultBox label="Recordes" value={String(totals.prs)} /></div><label className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f3f8f5] p-4"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} className="mt-1 h-4 w-4 accent-[#087a50]" /><span><b className="block text-sm">Publicar resumo do treino</b><span className="mt-1 block text-xs leading-relaxed text-[#71837b]">Você escolhe quem poderá ver. Os valores de cada série continuam privados.</span></span></label>{publish && <><div className="mt-4"><p className="text-sm font-bold">Quem pode ver</p><div className="mt-2 grid grid-cols-2 gap-2"><AudienceButton active={visibility === "coach"} icon={LockKeyhole} title="Meu treinador" detail="Só sua equipe" onClick={() => setVisibility("coach")} /><AudienceButton active={visibility === "community"} icon={Users} title="Comunidade" detail="Todos no Evolink" onClick={() => setVisibility("community")} /></div></div><label className="mt-4 block text-sm font-bold">Legenda opcional<textarea maxLength={500} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Como foi o treino de hoje?" className="mt-2 min-h-24 w-full resize-none rounded-xl border border-[#dbe7e0] p-3 font-normal outline-none focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]" /></label></>}<Button disabled={saving} onClick={onFinish} className="mt-6 w-full py-4">{saving ? "Salvando treino..." : "Concluir e salvar"}</Button></motion.section></motion.div>;
}

function ResultBox({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#e7f4ec] p-3 text-center"><b className="block text-lg text-[#174237]">{value}</b><span className="text-[10px] font-bold text-[#608073]">{label.toUpperCase()}</span></div>; }
function AudienceButton({ active, icon: Icon, title, detail, onClick }: { active: boolean; icon: typeof Users; title: string; detail: string; onClick: () => void }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-2xl border p-3 text-left transition ${active ? "border-[#087a50] bg-[#eff9f3]" : "border-[#dbe7e0] bg-white"}`}><Icon size={17} className={active ? "text-[#087a50]" : "text-[#71837b]"} /><b className="mt-2 block text-sm">{title}</b><span className="text-[11px] text-[#71837b]">{detail}</span></button>; }
function LoadingState() { return <div className="mt-7 space-y-3" aria-label="Carregando treino"><div className="h-44 animate-pulse rounded-3xl bg-[#e7f4ec]" /><div className="h-28 animate-pulse rounded-3xl bg-white" /></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="mt-7 max-w-xl rounded-3xl border border-[#f0d6d3] bg-white p-6"><h2 className="font-bold text-[#9f3535]">Não foi possível abrir o treino</h2><p className="mt-2 text-sm text-[#71837b]">{message}</p><Button onClick={onRetry} className="mt-5">Tentar novamente</Button></section>; }
function EmptyWorkout() { return <section className="mt-7 max-w-xl rounded-3xl border border-[#e2ece6] bg-white p-8 text-center"><Dumbbell className="mx-auto text-[#087a50]" /><h2 className="mt-4 text-xl font-bold">Nenhum treino publicado</h2><p className="mt-2 text-sm text-[#71837b]">Quando seu profissional publicar o próximo protocolo, ele aparecerá aqui.</p></section>; }

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) { const words = text.split(" "); let line = ""; let currentY = y; for (const word of words) { const test = `${line}${word} `; if (context.measureText(test).width > maxWidth && line) { context.fillText(line.trim(), x, currentY); line = `${word} `; currentY += lineHeight; } else line = test; } context.fillText(line.trim(), x, currentY); }
function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { context.beginPath(); context.roundRect(x, y, width, height, radius); }

export function CommunityFeedPage({ viewer }: { viewer: Viewer }) {
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getCommunityFeed(viewer.id).then((result) => {
      if (!active) return;
      setError(result.error?.message ?? "");
      setPosts(result.posts);
    });
    return () => { active = false; };
  }, [viewer.id]);
  async function like(post: CommunityPost) { setUpdating(post.id); const response = await togglePostLike(post.id, viewer.id, post.likedByViewer); setUpdating(null); if (response.error) { setError(response.error.message); return; } setPosts((current) => current?.map((item) => item.id === post.id ? { ...item, likedByViewer: !item.likedByViewer, likeCount: item.likeCount + (item.likedByViewer ? -1 : 1) } : item) ?? null); }
  return <Shell profile={viewer.role}><div className="mx-auto max-w-3xl"><PageTitle kicker="COMUNIDADE" title="Evolução compartilhada" text="Treinos reais, constância e conquistas de quem está fazendo acontecer." />{error && <p role="alert" className="mt-5 rounded-2xl bg-[#fdebea] p-4 text-sm font-semibold text-[#9f3535]">{error}</p>}{posts === null ? <LoadingState /> : posts.length === 0 ? <section className="mt-7 rounded-[2rem] border border-[#e2ece6] bg-white p-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]"><Users /></span><h2 className="mt-4 text-xl font-bold">A comunidade começa no próximo treino</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#71837b]">Ao concluir um treino, o aluno pode publicar um resumo para o treinador ou para toda a comunidade.</p></section> : <div className="mt-7 space-y-5">{posts.map((post) => <article key={post.id} className="overflow-hidden rounded-[2rem] border border-[#e2ece6] bg-white soft-shadow"><header className="flex items-center gap-3 p-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#b8e986] to-[#51aa83] text-sm font-black text-[#174237]">{post.authorName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="min-w-0 flex-1"><b className="block truncate">{post.authorName}</b><span className="text-xs text-[#71837b]">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(post.created_at))}</span></span><span className="inline-flex items-center gap-1 rounded-full bg-[#f3f8f5] px-2.5 py-1 text-[10px] font-bold text-[#52665e]">{post.visibility === "coach" ? <><LockKeyhole size={11} /> EQUIPE</> : <><Users size={11} /> COMUNIDADE</>}</span></header><section className="bg-[#07352b] p-5 text-white md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.16em] text-[#b8e986]">TREINO CONCLUÍDO</p><h2 className="mt-2 text-2xl font-black tracking-tight">{post.workout_title}</h2></div>{post.pr_count > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-[#b8e986] px-3 py-1.5 text-xs font-black text-[#174237]"><Medal size={14} /> {post.pr_count} PR</span>}</div><div className="mt-6 grid grid-cols-3 gap-2"><FeedStat label="Tempo" value={formatDuration(post.duration_seconds)} /><FeedStat label="Séries" value={String(post.total_sets)} /><FeedStat label="Volume" value={formatVolume(post.total_volume_kg)} /></div></section>{post.caption && <p className="px-5 pt-5 text-sm leading-relaxed text-[#405b52]">{post.caption}</p>}{post.exercise_summary.length > 0 && <div className="mx-5 mt-4 flex gap-2 overflow-x-auto pb-1">{post.exercise_summary.slice(0, 4).map((exercise) => <span key={exercise.name} className="shrink-0 rounded-xl bg-[#f3f8f5] px-3 py-2 text-xs font-semibold text-[#52665e]">{exercise.name} · {exercise.sets} séries</span>)}</div>}<footer className="mt-4 flex items-center border-t border-[#edf2ef] p-3"><button disabled={updating === post.id} onClick={() => void like(post)} aria-pressed={post.likedByViewer} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition active:scale-95 ${post.likedByViewer ? "bg-[#e7f4ec] text-[#087a50]" : "text-[#61756d] hover:bg-[#f3f8f5]"}`}><Heart size={18} fill={post.likedByViewer ? "currentColor" : "none"} /> {post.likeCount ? post.likeCount : "Curtir"}</button><span className="ml-auto inline-flex items-center gap-1 text-xs text-[#91a39b]"><Sparkles size={13} /> Evolink</span></footer></article>)}</div>}</div></Shell>;
}

function FeedStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/10 p-3"><b className="block text-lg">{value}</b><span className="text-[9px] font-bold tracking-[.1em] text-[#b8e986]">{label.toUpperCase()}</span></div>; }
