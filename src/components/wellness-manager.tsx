"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HeartPulse, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/app-shell";
import {
  archiveCardioPlan,
  cardioModalities,
  getStudentPrescriptions,
  removeHabitGoal,
  saveCardioPlan,
  saveHabitGoal,
  type CardioPlan,
  type HabitGoal,
  type HabitKind,
} from "@/lib/wellness-data";
import { Select } from "@/components/ui/select";

const card = "rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow";
const field = "mt-1.5 w-full rounded-xl border border-[#dbe7e0] bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";
const intensities = ["Leve", "Moderada", "Intensa", "Intervalado (HIIT)"];

const habitPresets: { kind: HabitKind; title: string; target?: number; unit?: string }[] = [
  { kind: "steps", title: "Passos diários", target: 8000, unit: "passos" },
  { kind: "sleep", title: "Horas de sono", target: 7, unit: "h" },
  { kind: "water", title: "Beber água", target: 3, unit: "L" },
  { kind: "supplement", title: "Suplementação" },
  { kind: "custom", title: "" },
];

/** Cardio and habit prescriptions, shown in the student's "Planos" tab. */
export function WellnessManager({ professionalId, studentId }: { professionalId: string; studentId: string }) {
  const [plans, setPlans] = useState<CardioPlan[] | null>(null);
  const [goals, setGoals] = useState<HabitGoal[]>([]);
  const [form, setForm] = useState<"cardio" | "habit" | null>(null);

  useEffect(() => {
    let active = true;
    getStudentPrescriptions(professionalId, studentId).then(result => {
      if (!active) return;
      setPlans(result.plans);
      setGoals(result.goals);
    });
    return () => { active = false; };
  }, [professionalId, studentId]);

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <section className={card}>
        <header className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-bold"><HeartPulse size={18} className="text-[#087a50]" />Cardio prescrito</h3>
          <Button kind="soft" className="px-3 py-2 text-xs" onClick={() => setForm(form === "cardio" ? null : "cardio")}><Plus size={15} />Prescrever</Button>
        </header>
        <AnimatePresence initial={false}>
          {form === "cardio" && (
            <Collapse>
              <CardioForm
                onCancel={() => setForm(null)}
                onSave={async input => {
                  const { data, error } = await saveCardioPlan(professionalId, studentId, input);
                  if (error || !data) return "Não foi possível salvar.";
                  setPlans(current => [data, ...(current ?? [])]);
                  setForm(null);
                  return null;
                }}
              />
            </Collapse>
          )}
        </AnimatePresence>
        {plans === null ? (
          <div className="mt-4 h-20 animate-pulse rounded-2xl bg-[#f3f8f5]" />
        ) : plans.length === 0 ? (
          <p className="mt-4 text-sm text-[#71837b]">Nenhum cardio ativo. O aluno ainda pode registrar atividades livres.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {plans.map(plan => (
              <li key={plan.id} className="flex items-center gap-3 rounded-2xl bg-[#f7faf8] p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{plan.title}</p>
                  <p className="text-xs text-[#71837b]">{plan.modality} · {plan.duration_minutes} min · {plan.sessions_per_week}x/semana · {plan.intensity}</p>
                </div>
                <RemoveButton label={`Encerrar ${plan.title}`} onConfirm={async () => { const { error } = await archiveCardioPlan(plan.id); if (!error) setPlans(current => (current ?? []).filter(item => item.id !== plan.id)); }} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <header className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-bold"><Sparkles size={18} className="text-[#087a50]" />Hábitos diários</h3>
          <Button kind="soft" className="px-3 py-2 text-xs" onClick={() => setForm(form === "habit" ? null : "habit")}><Plus size={15} />Adicionar</Button>
        </header>
        <AnimatePresence initial={false}>
          {form === "habit" && (
            <Collapse>
              <HabitForm
                onCancel={() => setForm(null)}
                onSave={async input => {
                  const { data, error } = await saveHabitGoal(professionalId, studentId, { ...input, position: goals.length });
                  if (error || !data) return "Não foi possível salvar.";
                  setGoals(current => [...current, data]);
                  setForm(null);
                  return null;
                }}
              />
            </Collapse>
          )}
        </AnimatePresence>
        {goals.length === 0 ? (
          <p className="mt-4 text-sm text-[#71837b]">Defina metas simples, como passos, sono ou suplementação. O aluno marca todo dia.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {goals.map(goal => (
              <li key={goal.id} className="flex items-center gap-3 rounded-2xl bg-[#f7faf8] p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{goal.title}</p>
                  <p className="text-xs text-[#71837b]">{goal.target_value ? `Meta: ${String(goal.target_value).replace(".", ",")} ${goal.unit ?? ""}` : "Marcar como feito"}</p>
                </div>
                <RemoveButton label={`Remover ${goal.title}`} onConfirm={async () => { const { error } = await removeHabitGoal(goal.id); if (!error) setGoals(current => current.filter(item => item.id !== goal.id)); }} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Collapse({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      {children}
    </motion.div>
  );
}

function RemoveButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming)
    return (
      <span className="flex items-center gap-1">
        <button onClick={onConfirm} className="rounded-lg bg-[#fdebea] px-2.5 py-1.5 text-xs font-bold text-[#b94242]">Remover</button>
        <button onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#71837b]">Cancelar</button>
      </span>
    );
  return (
    <button aria-label={label} onClick={() => setConfirming(true)} className="grid h-8 w-8 place-items-center rounded-lg text-[#91a39b] transition hover:bg-[#fdebea] hover:text-[#b94242]">
      <Trash2 size={15} />
    </button>
  );
}

function CardioForm({ onSave, onCancel }: { onSave: (input: Parameters<typeof saveCardioPlan>[2]) => Promise<string | null>; onCancel: () => void }) {
  const [values, setValues] = useState({ title: "", modality: "Esteira", minutes: "30", sessions: "3", intensity: "Moderada", notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues(current => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const minutes = Number(values.minutes);
    const sessions = Number(values.sessions);
    if (!minutes || minutes > 600 || !sessions || sessions > 14) return setError("Confira duração e sessões por semana.");
    setSaving(true);
    const message = await onSave({ title: values.title || `${values.modality} ${values.intensity.toLowerCase()}`, modality: values.modality, minutes, sessionsPerWeek: sessions, intensity: values.intensity, notes: values.notes });
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#e2ece6] p-4">
      <label className="col-span-2 text-xs font-bold">Título<input value={values.title} onChange={set("title")} placeholder="Ex.: Cardio pós-treino" className={field} /></label>
      <div className="text-xs font-bold">Modalidade
        <Select size="sm" className="mt-1.5" value={values.modality} onChange={value => setValues(current => ({ ...current, modality: value }))} options={cardioModalities.map(option => ({ value: option, label: option }))} />
      </div>
      <div className="text-xs font-bold">Intensidade
        <Select size="sm" className="mt-1.5" value={values.intensity} onChange={value => setValues(current => ({ ...current, intensity: value }))} options={intensities.map(option => ({ value: option, label: option }))} />
      </div>
      <label className="text-xs font-bold">Minutos<input value={values.minutes} onChange={set("minutes")} inputMode="numeric" className={field} /></label>
      <label className="text-xs font-bold">Vezes por semana<input value={values.sessions} onChange={set("sessions")} inputMode="numeric" className={field} /></label>
      <label className="col-span-2 text-xs font-bold">Orientações<input value={values.notes} onChange={set("notes")} placeholder="Ex.: FC entre 120 e 140 bpm" className={field} /></label>
      {error && <p className="col-span-2 text-sm font-semibold text-[#b94242]">{error}</p>}
      <div className="col-span-2 flex justify-end gap-2">
        <Button kind="outline" type="button" onClick={onCancel} className="py-2">Cancelar</Button>
        <Button type="submit" disabled={saving} className="py-2">{saving ? "Salvando..." : "Publicar cardio"}</Button>
      </div>
    </form>
  );
}

function HabitForm({ onSave, onCancel }: { onSave: (input: { kind: HabitKind; title: string; target?: number; unit?: string }) => Promise<string | null>; onCancel: () => void }) {
  const [preset, setPreset] = useState(0);
  const [title, setTitle] = useState(habitPresets[0].title);
  const [target, setTarget] = useState(String(habitPresets[0].target ?? ""));
  const [unit, setUnit] = useState(habitPresets[0].unit ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function choose(index: number) {
    const option = habitPresets[index];
    setPreset(index);
    setTitle(option.title);
    setTarget(option.target ? String(option.target) : "");
    setUnit(option.unit ?? "");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 2) return setError("Dê um nome para o hábito.");
    const targetValue = target ? Number(target.replace(",", ".")) : undefined;
    if (targetValue !== undefined && !(targetValue > 0)) return setError("Meta inválida.");
    setSaving(true);
    const message = await onSave({ kind: habitPresets[preset].kind, title, target: targetValue, unit });
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-[#e2ece6] p-4">
      <div className="flex flex-wrap gap-2">
        {habitPresets.map((option, index) => (
          <button key={option.kind} type="button" onClick={() => choose(index)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${preset === index ? "border-[#087a50] bg-[#e7f4ec] text-[#076841]" : "border-[#dbe7e0] text-[#52665e]"}`}>
            {option.title || "Personalizado"}
          </button>
        ))}
      </div>
      <label className="block text-xs font-bold">Nome<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Alongamento" className={field} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold">Meta (opcional)<input value={target} onChange={event => setTarget(event.target.value)} inputMode="decimal" className={field} /></label>
        <label className="text-xs font-bold">Unidade<input value={unit} onChange={event => setUnit(event.target.value)} placeholder="Ex.: min" className={field} /></label>
      </div>
      {error && <p className="text-sm font-semibold text-[#b94242]">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button kind="outline" type="button" onClick={onCancel} className="py-2">Cancelar</Button>
        <Button type="submit" disabled={saving} className="py-2">{saving ? "Salvando..." : "Adicionar hábito"}</Button>
      </div>
    </form>
  );
}
