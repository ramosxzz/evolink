"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Clock3, MessageSquareText, Pencil } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getWeekCheckin, saveCheckin, type Viewer } from "@/lib/evolink-data";

type WeekCheckin = Awaited<ReturnType<typeof getWeekCheckin>>;

const scales = [
  { key: "nutrition", label: "Alimentação", low: "Saí muito do plano", high: "Segui à risca" },
  { key: "energy", label: "Disposição", low: "Sem energia", high: "Com muita energia" },
  { key: "sleep", label: "Sono", low: "Dormi mal", high: "Dormi muito bem" },
  { key: "stress", label: "Estresse", low: "Tranquilo", high: "Muito estressado" },
] as const;
type ScaleKey = (typeof scales)[number]["key"];

const card = "rounded-3xl bg-white p-5 shadow-[var(--card-shadow)] sm:p-6";
const field = "mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--emerald)] focus:ring-4 focus:ring-[var(--ring)]";

export function CheckinPage({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [current, setCurrent] = useState<WeekCheckin | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    getWeekCheckin(viewer.id).then(result => { if (active) setCurrent(result); });
    return () => { active = false; };
  }, [viewer.id]);

  if (current === undefined)
    return (
      <Shell profile="student">
        <div className="space-y-3"><Skeleton className="h-8 w-64 rounded-xl" /><Skeleton className="h-4 w-80 max-w-full rounded-full" /></div>
        <Skeleton className="mt-6 h-[420px] rounded-3xl" />
      </Shell>
    );

  if (!viewer.counterpart)
    return (
      <Shell profile="student">
        <PageTitle title="Check-in semanal" text="Conte como foi a semana para o seu profissional ajustar o plano." />
        <section className={`${card} mt-6 text-center`}>
          <p className="font-bold">Vincule um profissional para enviar check-ins</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Use o link de convite que seu treinador enviou.</p>
          <Button onClick={() => router.push("/aluno/perfil")} className="mt-5">Vincular profissional</Button>
        </section>
      </Shell>
    );

  const sent = current && current.status !== "draft";
  const showForm = !sent || editing;

  return (
    <Shell profile="student">
      <PageTitle title="Check-in semanal" text={`Conte como foi a semana para ${viewer.counterpart.fullName.split(" ")[0]} ajustar o seu plano.`} />
      <AnimatePresence mode="wait" initial={false}>
        {showForm ? (
          <motion.div key="form" initial={{ y: 8 }} animate={{ y: 0 }} exit={{ opacity: 0 }}>
            <CheckinForm viewer={viewer} initial={current} onSaved={next => { setCurrent(next); setEditing(false); }} />
          </motion.div>
        ) : (
          <motion.div key="summary" initial={{ y: 8 }} animate={{ y: 0 }} exit={{ opacity: 0 }}>
            <Summary checkin={current!} onEdit={current!.status === "submitted" ? () => setEditing(true) : undefined} coachName={viewer.counterpart.fullName} />
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

function Summary({ checkin, onEdit, coachName }: { checkin: NonNullable<WeekCheckin>; onEdit?: () => void; coachName: string }) {
  const reviewed = checkin.status === "reviewed";
  const values: Record<ScaleKey, number | null> = { nutrition: checkin.nutrition_score, energy: checkin.energy_score, sleep: checkin.sleep_score, stress: checkin.stress_score };
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
      <section className={card}>
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-full ${reviewed ? "bg-[var(--mint)] text-[var(--emerald)]" : "bg-[#eef4fb] text-[#2b6cb0]"}`}>{reviewed ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}</span>
          <div>
            <p className="font-bold">{reviewed ? "Check-in respondido" : "Check-in enviado"}</p>
            <p className="text-sm text-[var(--muted)]">{reviewed ? `${coachName.split(" ")[0]} já respondeu.` : "Aguardando a resposta do seu profissional."}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          {scales.map(scale => (
            <div key={scale.key} className="rounded-2xl bg-[#f6f9f7] p-3">
              <dt className="text-xs font-semibold text-[var(--muted)]">{scale.label}</dt>
              <dd className="mt-0.5 text-lg font-bold tabular">{values[scale.key] ?? "-"}<span className="text-sm font-medium text-[var(--muted)]">/5</span></dd>
            </div>
          ))}
          <div className="rounded-2xl bg-[#f6f9f7] p-3">
            <dt className="text-xs font-semibold text-[var(--muted)]">Dias de treino</dt>
            <dd className="mt-0.5 text-lg font-bold tabular">{checkin.training_days ?? "-"}</dd>
          </div>
          <div className="rounded-2xl bg-[#f6f9f7] p-3">
            <dt className="text-xs font-semibold text-[var(--muted)]">Peso</dt>
            <dd className="mt-0.5 text-lg font-bold tabular">{checkin.current_weight_kg ? `${String(checkin.current_weight_kg).replace(".", ",")} kg` : "-"}</dd>
          </div>
        </dl>
        {checkin.student_message && <p className="mt-4 rounded-2xl bg-[#f6f9f7] p-4 text-sm text-[#40554c]">“{checkin.student_message}”</p>}
        {onEdit && <Button kind="outline" onClick={onEdit} className="mt-5 w-full"><Pencil size={15} />Editar respostas</Button>}
      </section>
      <section className={card}>
        <p className="flex items-center gap-2 font-bold"><MessageSquareText size={18} className="text-[var(--emerald)]" />Retorno do profissional</p>
        {checkin.professional_feedback ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">{checkin.professional_feedback}</p>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">Assim que {coachName.split(" ")[0]} responder, o retorno aparece aqui e você recebe uma notificação.</p>
        )}
      </section>
    </div>
  );
}

function CheckinForm({ viewer, initial, onSaved }: { viewer: Viewer; initial: WeekCheckin; onSaved: (value: WeekCheckin) => void }) {
  const reduceMotion = useReducedMotion();
  const [scores, setScores] = useState<Record<ScaleKey, number>>({
    nutrition: initial?.nutrition_score ?? 0,
    energy: initial?.energy_score ?? 0,
    sleep: initial?.sleep_score ?? 0,
    stress: initial?.stress_score ?? 0,
  });
  const [days, setDays] = useState<number | null>(initial?.training_days ?? null);
  const [weight, setWeight] = useState(initial?.current_weight_kg ? String(initial.current_weight_kg).replace(".", ",") : "");
  const [message, setMessage] = useState(initial?.student_message ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (scores.nutrition === 0 || scores.energy === 0) return setError("Responda alimentação e disposição.");
    if (days === null) return setError("Quantos dias você treinou?");
    const weightValue = weight ? Number(weight.replace(",", ".")) : undefined;
    if (weightValue !== undefined && (!weightValue || weightValue < 20 || weightValue > 400)) return setError("Peso inválido.");
    setSaving(true);
    setError("");
    const { error: saveError } = await saveCheckin(viewer, { nutrition: scores.nutrition, energy: scores.energy, sleep: scores.sleep || undefined, stress: scores.stress || undefined, trainingDays: days, weight: weightValue, message: message.trim() || undefined });
    if (saveError) { setSaving(false); return setError("Não foi possível enviar. Tente novamente."); }
    onSaved(await getWeekCheckin(viewer.id));
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <section className={`${card} space-y-6`}>
        {scales.map(scale => (
          <fieldset key={scale.key}>
            <legend className="text-sm font-bold">{scale.label}{scale.key === "sleep" || scale.key === "stress" ? <span className="ml-1 font-normal text-[var(--muted)]">(opcional)</span> : null}</legend>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(value => {
                const active = scores[scale.key] === value;
                return (
                  <motion.button
                    type="button"
                    key={value}
                    whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                    onClick={() => setScores(current => ({ ...current, [scale.key]: current[scale.key] === value ? 0 : value }))}
                    aria-pressed={active}
                    className={`h-11 rounded-xl border text-sm font-bold transition-colors ${active ? "border-[var(--emerald)] bg-[var(--emerald)] text-white" : "border-[var(--line)] bg-white text-[#40554c] hover:border-[#c7d9cf]"}`}
                  >
                    {value}
                  </motion.button>
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-[#8a9c94]"><span>{scale.low}</span><span>{scale.high}</span></div>
          </fieldset>
        ))}
      </section>

      <section className={`${card} flex flex-col`}>
        <p className="text-sm font-bold">Dias de treino na semana</p>
        <div className="mt-2 grid grid-cols-8 gap-1.5">
          {Array.from({ length: 8 }, (_, value) => (
            <button type="button" key={value} onClick={() => setDays(value)} aria-pressed={days === value} className={`h-10 rounded-lg border text-sm font-bold transition-colors ${days === value ? "border-[var(--emerald)] bg-[var(--mint)] text-[var(--emerald)]" : "border-[var(--line)] text-[#40554c] hover:border-[#c7d9cf]"}`}>
              {value}
            </button>
          ))}
        </div>
        <label className="mt-5 block text-sm font-bold">Peso atual (kg) <span className="font-normal text-[var(--muted)]">(opcional)</span>
          <input value={weight} onChange={event => setWeight(event.target.value)} inputMode="decimal" placeholder="86,4" className={field} />
        </label>
        <label className="mt-5 block text-sm font-bold">Quer contar algo?
          <textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={1000} placeholder="Dificuldades, dúvidas ou conquistas da semana." className={`${field} min-h-28 resize-none`} />
        </label>
        <div className="mt-auto pt-5">
          {error && <p className="mb-3 text-sm font-semibold text-[#b94242]">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full py-3">{saving ? "Enviando..." : initial && initial.status !== "draft" ? "Atualizar check-in" : "Enviar check-in"}</Button>
        </div>
      </section>
    </form>
  );
}
