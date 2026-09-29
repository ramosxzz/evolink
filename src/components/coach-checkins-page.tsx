"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronRight, ClipboardCheck, Send } from "lucide-react";
import { Avatar, Button, PageTitle, Shell } from "@/components/app-shell";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useCached } from "@/lib/page-cache";
import { getProfessionalCheckins, reviewCheckin, type Viewer } from "@/lib/evolink-data";

type Checkin = Awaited<ReturnType<typeof getProfessionalCheckins>>[number];
type Tab = "pendentes" | "respondidos";

const quickReplies = [
  "Ótima semana! Vamos manter o plano.",
  "Vou ajustar sua dieta para ajudar com a fome.",
  "Aumente a carga nos exercícios principais esta semana.",
  "Priorize o sono: tente dormir 7 horas.",
];

const scoreFields = [
  ["nutrition_score", "Alimentação"],
  ["energy_score", "Disposição"],
  ["sleep_score", "Sono"],
  ["stress_score", "Estresse"],
] as const;

export function CoachCheckinsPage({ viewer }: { viewer: Viewer }) {
  const [checkins, setCheckins] = useCached<Checkin[] | null>(`pro-checkins:${viewer.id}`, null);
  const [tab, setTab] = useState<Tab>("pendentes");

  useEffect(() => {
    let active = true;
    getProfessionalCheckins(viewer.id).then(rows => { if (active) setCheckins(rows); });
    return () => { active = false; };
  }, [viewer.id, setCheckins]);

  // Previous weight per student, to show the change since the last check-in.
  const previousWeight = useMemo(() => {
    const map = new Map<string, number | null>();
    const byStudent = new Map<string, Checkin[]>();
    for (const item of checkins ?? []) byStudent.set(item.student_id, [...(byStudent.get(item.student_id) ?? []), item]);
    for (const list of byStudent.values()) {
      const sorted = [...list].sort((a, b) => (b.week_of ?? "").localeCompare(a.week_of ?? ""));
      sorted.forEach((item, index) => map.set(item.id, sorted[index + 1]?.current_weight_kg != null ? Number(sorted[index + 1].current_weight_kg) : null));
    }
    return map;
  }, [checkins]);

  const pending = (checkins ?? []).filter(item => item.status === "submitted");
  const answered = (checkins ?? []).filter(item => item.status === "reviewed");
  const visible = tab === "pendentes" ? pending : answered;

  return (
    <Shell profile="professional">
      <PageTitle title="Check-ins" text={checkins ? (pending.length ? `${pending.length} ${pending.length === 1 ? "check-in aguardando" : "check-ins aguardando"} sua resposta.` : "Tudo respondido por aqui.") : "Carregando check-ins."} />

      <div className="mt-6 flex w-full gap-1 rounded-xl bg-[#e9f0ec] p-1 sm:w-fit">
        {([["pendentes", `Pendentes${pending.length ? ` · ${pending.length}` : ""}`], ["respondidos", "Respondidos"]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)} className={`relative flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${tab === value ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
            {tab === value && <motion.span layoutId="coach-checkins-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {checkins === null ? (
        <div className="mt-5"><ListSkeleton rows={3} /></div>
      ) : visible.length === 0 ? (
        <section className="mt-5 rounded-3xl border border-dashed border-[#cfe3d8] bg-white px-6 py-12 text-center">
          {tab === "pendentes" ? <CheckCircle2 className="mx-auto text-[#9cc7b1]" /> : <ClipboardCheck className="mx-auto text-[#9cc7b1]" />}
          <h2 className="mt-3 font-bold">{tab === "pendentes" ? "Nenhum check-in pendente" : "Nenhum check-in respondido ainda"}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">{tab === "pendentes" ? "Quando um aluno enviar o check-in da semana, ele aparece aqui." : "As respostas que você enviar ficam guardadas aqui."}</p>
        </section>
      ) : (
        <div className="mt-5 space-y-4">
          <AnimatePresence initial={false}>
            {visible.map(item => (
              <CheckinCard
                key={item.id}
                checkin={item}
                previousWeight={previousWeight.get(item.id) ?? null}
                onReviewed={feedback => setCheckins(current => (current ?? []).map(row => (row.id === item.id ? { ...row, status: "reviewed" as const, professional_feedback: feedback } : row)))}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </Shell>
  );
}

function CheckinCard({ checkin, previousWeight, onReviewed }: { checkin: Checkin; previousWeight: number | null; onReviewed: (feedback: string) => void }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string>(checkin.professional_feedback ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const name = (checkin.profiles as { full_name?: string } | null)?.full_name ?? "Aluno";
  const reviewed = checkin.status === "reviewed";
  const weight = checkin.current_weight_kg != null ? Number(checkin.current_weight_kg) : null;
  const delta = weight !== null && previousWeight !== null ? weight - previousWeight : null;

  async function send() {
    if (feedback.trim().length < 3) return setError("Escreva uma orientação para o aluno.");
    setSending(true);
    setError("");
    const { error: saveError } = await reviewCheckin(checkin.id, feedback.trim());
    setSending(false);
    if (saveError) return setError("Não foi possível enviar.");
    onReviewed(feedback.trim());
  }

  return (
    <motion.article layout initial={{ y: 8 }} animate={{ y: 0 }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-3xl bg-white shadow-[var(--card-shadow)]">
      <button onClick={() => router.push(`/profissional/alunos/${checkin.student_id}`)} className="flex w-full items-center gap-3 border-b border-[#f0f4f2] px-5 py-4 text-left transition hover:bg-[#f8fbf9]">
        <Avatar name={name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{name}</span>
          <span className="block text-xs text-[var(--muted)]">
            {checkin.week_of ? `Semana de ${new Date(`${checkin.week_of}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}` : ""}
            {checkin.submitted_at ? ` · enviado ${new Date(checkin.submitted_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}` : ""}
          </span>
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${reviewed ? "bg-[var(--mint)] text-[var(--emerald)]" : "bg-[#fff4d8] text-[#8a6100]"}`}>{reviewed ? "Respondido" : "Pendente"}</span>
        <ChevronRight size={18} className="text-[#b3c2bb]" />
      </button>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
            {scoreFields.map(([key, label]) => (
              <div key={key} className="rounded-2xl bg-[#f6f9f7] p-3">
                <dt className="text-[11px] font-semibold text-[var(--muted)]">{label}</dt>
                <dd className={`mt-0.5 text-lg font-bold tabular ${scoreTone(key, checkin[key])}`}>{checkin[key] ?? "-"}<span className="text-xs font-medium text-[var(--muted)]">/5</span></dd>
              </div>
            ))}
            <div className="rounded-2xl bg-[#f6f9f7] p-3">
              <dt className="text-[11px] font-semibold text-[var(--muted)]">Treinos</dt>
              <dd className="mt-0.5 text-lg font-bold tabular">{checkin.training_days ?? "-"}<span className="text-xs font-medium text-[var(--muted)]">/7</span></dd>
            </div>
            <div className="rounded-2xl bg-[#f6f9f7] p-3">
              <dt className="text-[11px] font-semibold text-[var(--muted)]">Peso</dt>
              <dd className="mt-0.5 flex items-baseline gap-1 text-lg font-bold tabular">
                {weight !== null ? String(weight).replace(".", ",") : "-"}
                {delta !== null && Math.abs(delta) >= 0.05 && (
                  <span className={`flex items-center text-xs font-semibold ${delta < 0 ? "text-[var(--emerald)]" : "text-[#b86b00]"}`}>
                    {delta < 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}{Math.abs(delta).toFixed(1).replace(".", ",")}
                  </span>
                )}
              </dd>
            </div>
          </dl>
          {checkin.difficulties && <p className="mt-3 text-sm"><span className="font-semibold">Dificuldades:</span> <span className="text-[#40554c]">{checkin.difficulties}</span></p>}
          {checkin.student_message && <blockquote className="mt-3 rounded-2xl bg-[#f6f9f7] p-4 text-sm leading-relaxed text-[#1d3b33]">“{checkin.student_message}”</blockquote>}
        </div>

        <div className="flex flex-col">
          <p className="text-sm font-semibold">{reviewed ? "Sua resposta" : "Responder"}</p>
          {!reviewed && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickReplies.map(reply => (
                <button key={reply} type="button" onClick={() => setFeedback(current => (current ? `${current} ${reply}` : reply))} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[#40554c] transition hover:border-[var(--emerald)] hover:text-[var(--emerald)]">
                  {reply}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={feedback}
            onChange={event => setFeedback(event.target.value)}
            readOnly={reviewed}
            placeholder="Escreva uma orientação objetiva para a próxima semana."
            className={`mt-3 min-h-28 flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition ${reviewed ? "border-transparent bg-[#f6f9f7] text-[#40554c]" : "border-[var(--line)] focus:border-[var(--emerald)] focus:ring-4 focus:ring-[var(--ring)]"}`}
          />
          {error && <p className="mt-2 text-sm font-semibold text-[#b94242]">{error}</p>}
          {!reviewed && <Button onClick={send} disabled={sending} className="mt-3 self-end"><Send size={15} />{sending ? "Enviando..." : "Enviar resposta"}</Button>}
        </div>
      </div>
    </motion.article>
  );
}

/** Stress is better when low; the other scores are better when high. */
function scoreTone(key: (typeof scoreFields)[number][0], value: number | null) {
  if (value == null) return "";
  const good = key === "stress_score" ? value <= 2 : value >= 4;
  const bad = key === "stress_score" ? value >= 4 : value <= 2;
  return good ? "text-[var(--emerald)]" : bad ? "text-[#b3362f]" : "";
}
