"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Footprints,
  GlassWater,
  HeartPulse,
  Moon,
  Sparkles,
} from "lucide-react";
import { PageTitle, Shell } from "@/components/app-shell";

type PaymentStatus = "paid" | "pending" | "overdue";
type StudentStatus = "Em dia" | "Atenção" | "Suspenso";


const card = "rounded-3xl border border-[#e2ece6] bg-white soft-shadow";

function StatusBadge({
  status,
}: {
  status: StudentStatus | PaymentStatus | string;
}) {
  const tone =
    status === "Em dia" || status === "paid" || status === "Respondido"
      ? "bg-[#e7f4ec] text-[#087a50]"
      : status === "Suspenso" || status === "overdue" || status === "Atrasado"
        ? "bg-[#fdebea] text-[#b94242]"
        : "bg-[#fff4d8] text-[#9a6800]";
  const label =
    status === "paid"
      ? "Pago"
      : status === "pending"
        ? "Pendente"
        : status === "overdue"
          ? "Atrasado"
          : status;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#173f34] px-4 py-3 text-sm font-semibold text-white shadow-xl"
    >
      <CheckCircle2 size={17} className="text-[#b8e986]" />
      {message}
    </motion.div>
  );
}



export function CardioPage() {
  const [done, setDone] = useState([true, false, false]);
  const [toast, setToast] = useState("");
  return (
    <Shell profile="student">
      <PageTitle
        kicker="CARDIO"
        title="Seu condicionamento, com direção."
        text="Zona 2 · bicicleta ou caminhada inclinada · 3 vezes por semana."
      />
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className={`${card} p-5 md:p-6`}>
          <CardioPrescription />
          <div className="mt-6 space-y-3">
            {["Terça, 6 ago", "Quinta, 8 ago", "Sábado, 10 ago"].map(
              (date, index) => (
                <button
                  key={date}
                  onClick={() => {
                    setDone((value) =>
                      value.map((item, itemIndex) =>
                        itemIndex === index ? !item : item,
                      ),
                    );
                    if (!done[index])
                      setToast("Cardio registrado. Boa consistência!");
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${done[index] ? "border-[#bfe4cd] bg-[#f4fbf7]" : "border-[#e2ece6]"}`}
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${done[index] ? "bg-[#087a50] text-white" : "bg-[#edf3ef] text-[#71837b]"}`}
                  >
                    {done[index] ? <Check size={17} /> : index + 1}
                  </span>
                  <span>
                    <b className="block text-sm">{date}</b>
                    <span className="text-xs text-[#71837b]">
                      30 minutos · intensidade moderada
                    </span>
                  </span>
                  <span className="ml-auto text-xs font-bold text-[#087a50]">
                    {done[index] ? "Realizado" : "Marcar"}
                  </span>
                </button>
              ),
            )}
          </div>
        </section>
        <section className="rounded-3xl bg-[#173f34] p-6 text-white">
          <HeartPulse size={24} className="text-[#b8e986]" />
          <p className="mt-5 text-xs font-bold tracking-[.14em] text-[#b8e986]">
            ORIENTAÇÃO
          </p>
          <h2 className="mt-2 text-2xl font-bold">Ritmo sustentável.</h2>
          <p className="mt-3 text-sm leading-relaxed text-emerald-100">
            Mantenha uma intensidade em que ainda consiga falar frases curtas.
            Se sentir tontura ou dor, interrompa e avise sua profissional.
          </p>
          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <p className="text-xs text-emerald-200">ADERÊNCIA DO CICLO</p>
            <p className="mt-1 text-3xl font-bold">67%</p>
            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div className="h-full w-2/3 rounded-full bg-[#b8e986]" />
            </div>
          </div>
        </section>
      </div>
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </Shell>
  );
}

function CardioPrescription({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-[.12em] text-[#087a50]">
            PRESCRIÇÃO ATUAL
          </p>
          <h2 className="mt-1 text-xl font-bold">Base aeróbica · Zona 2</h2>
        </div>
        <StatusBadge status="Em dia" />
      </div>
      <div
        className={`mt-5 grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}
      >
        {[
          [Clock3, "Duração", "30 min"],
          [CalendarDays, "Frequência", "3x/sem"],
          [Activity, "Intensidade", "Moderada"],
          [HeartPulse, "Referência", "125–145 bpm"],
        ].map(([Icon, label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-[#f5f9f7] p-3">
            <Icon size={16} className="text-[#087a50]" />
            <p className="mt-3 text-[10px] font-bold text-[#71837b]">
              {label as string}
            </p>
            <p className="mt-1 text-sm font-bold">{value as string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HabitsPage() {
  const initial = [true, true, false, true, false];
  const [done, setDone] = useState(initial);
  const habits = [
    [GlassWater, "Água", "2,5 litros"],
    [Footprints, "Passos", "8.000 passos"],
    [Moon, "Sono", "7h30 por noite"],
    [HeartPulse, "Cardio", "30 minutos"],
    [Sparkles, "Suplementação", "Creatina · 5 g"],
  ] as const;
  const percent = Math.round((done.filter(Boolean).length / done.length) * 100);
  return (
    <Shell profile="student">
      <PageTitle
        kicker="HÁBITOS & ORIENTAÇÕES"
        title="O básico bem feito, todos os dias."
        text="Metas definidas pela sua profissional para apoiar o plano."
      />
      <section className="mt-6 rounded-3xl bg-[#087a50] p-6 text-white">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold tracking-[.12em] text-[#b8e986]">
              PROGRESSO DE HOJE
            </p>
            <p className="mt-2 text-3xl font-bold">{percent}% concluído</p>
          </div>
          <b className="text-lg">
            {done.filter(Boolean).length}/{done.length}
          </b>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
          <motion.div
            animate={{ width: `${percent}%` }}
            className="h-full rounded-full bg-[#b8e986]"
          />
        </div>
      </section>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {habits.map(([Icon, title, target], index) => (
          <button
            key={title}
            onClick={() =>
              setDone((value) =>
                value.map((item, itemIndex) =>
                  itemIndex === index ? !item : item,
                ),
              )
            }
            className={`${card} flex items-center gap-4 p-5 text-left ${done[index] ? "border-[#bfe4cd]" : ""}`}
          >
            <span
              className={`grid h-12 w-12 place-items-center rounded-2xl ${done[index] ? "bg-[#087a50] text-white" : "bg-[#e7f4ec] text-[#087a50]"}`}
            >
              {done[index] ? <Check size={20} /> : <Icon size={20} />}
            </span>
            <span className="flex-1">
              <b className="block">{title}</b>
              <span className="mt-1 block text-sm text-[#71837b]">
                Meta: {target}
              </span>
            </span>
            <span
              className={`text-xs font-bold ${done[index] ? "text-[#087a50]" : "text-[#91a39b]"}`}
            >
              {done[index] ? "Concluído" : "Marcar"}
            </span>
          </button>
        ))}
      </div>
    </Shell>
  );
}
