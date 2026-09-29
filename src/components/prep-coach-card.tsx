"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Trophy } from "lucide-react";
import { Button } from "@/components/app-shell";
import { localDate } from "@/lib/dates";
import { getStudentPrepForCoach, saveCoachNotes, type ContestPrep } from "@/lib/prep-data";

/** Shown on the student's record when they have an active contest prep. */
export function PrepCoachCard({ studentId }: { studentId: string }) {
  const [prep, setPrep] = useState<ContestPrep | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getStudentPrepForCoach(studentId).then(result => {
      if (!active || !result) return;
      setPrep(result);
      setNotes(result.coach_notes ?? "");
    });
    return () => { active = false; };
  }, [studentId]);

  if (!prep) return null;
  const daysLeft = Math.ceil((new Date(`${prep.stage_date}T12:00:00`).getTime() - new Date(`${localDate()}T12:00:00`).getTime()) / 86_400_000);

  async function save() {
    if (!prep) return;
    setSaving(true);
    const { error } = await saveCoachNotes(prep.id, notes);
    setSaving(false);
    if (!error) { setSaved(true); window.setTimeout(() => setSaved(false), 2000); }
  }

  return (
    <section className="mt-5 grid gap-4 rounded-3xl bg-white p-5 shadow-[var(--card-shadow)] md:grid-cols-[240px_1fr]">
      <div className="rounded-2xl bg-gradient-to-br from-[#07352b] to-[#087a50] p-5 text-white">
        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-100"><Trophy size={14} />Em preparação</p>
        <p className="mt-2 text-4xl font-bold tabular">{Math.max(0, daysLeft)}<span className="ml-1 text-sm font-semibold text-emerald-100">dias</span></p>
        <p className="mt-1 text-sm font-semibold">{prep.title}</p>
        <p className="text-xs text-emerald-100">{prep.category ?? "Categoria não definida"}{prep.target_weight_kg ? ` · meta ${String(prep.target_weight_kg).replace(".", ",")} kg` : ""}</p>
      </div>
      <div className="flex flex-col">
        <label className="text-sm font-bold" htmlFor={`prep-notes-${prep.id}`}>Orientações da preparação</label>
        <textarea id={`prep-notes-${prep.id}`} value={notes} onChange={event => setNotes(event.target.value)} maxLength={2000} placeholder="Estratégia de pico, carboidratos, água, poses e pesagem." className="mt-2 min-h-24 flex-1 resize-none rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--emerald)] focus:ring-4 focus:ring-[var(--ring)]" />
        <div className="mt-3 flex items-center justify-end gap-3">
          {saved && <span className="flex items-center gap-1 text-sm font-semibold text-[var(--emerald)]"><CheckCircle2 size={15} />Salvo</span>}
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar orientações"}</Button>
        </div>
      </div>
    </section>
  );
}
