"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Apple, Check, ChevronDown, Repeat2 } from "lucide-react";
import { PageTitle, Shell } from "@/components/app-shell";
import { ProgressBar } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentDiet, toggleMeal, type Meal, type Viewer } from "@/lib/evolink-data";

type DietState = Awaited<ReturnType<typeof getStudentDiet>>;

const formatQuantity = (item: Meal["meal_items"][number]) => {
  if (item.quantity == null) return null;
  const amount = String(item.quantity).replace(".", ",");
  return item.unit ? `${amount} ${item.unit}` : amount;
};

export function DietPage({ viewer }: { viewer: Viewer }) {
  const [diet, setDiet] = useState<DietState | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    getStudentDiet(viewer.id).then(result => {
      if (!active) return;
      setDiet(result);
      setDone(new Set(result.completedMealIds));
    });
    return () => { active = false; };
  }, [viewer.id]);

  async function toggle(meal: Meal) {
    const next = !done.has(meal.id);
    setDone(current => { const copy = new Set(current); if (next) copy.add(meal.id); else copy.delete(meal.id); return copy; });
    const { error } = await toggleMeal(viewer.id, meal.id, next);
    if (error) setDone(current => { const copy = new Set(current); if (next) copy.delete(meal.id); else copy.add(meal.id); return copy; });
  }

  if (diet === null)
    return (
      <Shell profile="student">
        <div className="space-y-3"><Skeleton className="h-8 w-60 rounded-xl" /><Skeleton className="h-4 w-80 max-w-full rounded-full" /></div>
        <Skeleton className="mt-6 h-24 rounded-3xl" />
        <div className="mt-4 space-y-3">{[0, 1, 2].map(item => <Skeleton key={item} className="h-36 rounded-3xl" />)}</div>
      </Shell>
    );

  if (!diet.plan)
    return (
      <Shell profile="student">
        <PageTitle title="Sua dieta" text="Seu plano alimentar aparece aqui assim que for publicado." />
        <section className="mt-6 rounded-3xl border border-dashed border-[#cfe3d8] bg-white px-6 py-12 text-center">
          <Apple className="mx-auto text-[#9cc7b1]" />
          <h2 className="mt-3 font-bold">Nenhuma dieta publicada ainda</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">Quando seu profissional publicar o plano, você recebe uma notificação.</p>
        </section>
      </Shell>
    );

  const total = diet.meals.length;
  const completed = diet.meals.filter(meal => done.has(meal.id)).length;
  const nextMeal = diet.meals.find(meal => !done.has(meal.id));

  return (
    <Shell profile="student">
      <PageTitle title={diet.plan.title} text={diet.plan.notes || "Toque no círculo para marcar cada refeição como feita."} />

      <section className="mt-6 flex items-center gap-5 rounded-3xl bg-white p-5 shadow-[var(--card-shadow)]">
        <ProgressRing value={total ? completed / total : 0} label={`${completed}/${total}`} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{completed === total ? "Todas as refeições de hoje feitas" : `${total - completed} ${total - completed === 1 ? "refeição restante" : "refeições restantes"}`}</p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{nextMeal ? `Próxima: ${nextMeal.name}${nextMeal.scheduled_time ? ` às ${nextMeal.scheduled_time.slice(0, 5)}` : ""}` : "Ótimo trabalho hoje."}</p>
          <div className="mt-3"><ProgressBar value={total ? completed / total : 0} /></div>
        </div>
      </section>

      <ol className="relative mt-6 space-y-3 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-px before:bg-[var(--line)] sm:before:left-[31px]">
        {diet.meals.map(meal => <MealRow key={meal.id} meal={meal} done={done.has(meal.id)} isNext={meal.id === nextMeal?.id} onToggle={() => toggle(meal)} />)}
      </ol>
    </Shell>
  );
}

function MealRow({ meal, done, isNext, onToggle }: { meal: Meal; done: boolean; isNext: boolean; onToggle: () => void }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const hasSubstitutions = meal.meal_items.some(item => item.substitutions?.length);

  return (
    <li className="relative flex gap-3 sm:gap-4">
      <motion.button
        onClick={onToggle}
        whileTap={reduceMotion ? undefined : { scale: 0.88 }}
        aria-pressed={done}
        aria-label={done ? `Desmarcar ${meal.name}` : `Marcar ${meal.name} como feita`}
        className={`relative z-[1] mt-4 grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 transition-colors sm:h-16 sm:w-16 ${done ? "border-[var(--emerald)] bg-[var(--emerald)] text-white" : isNext ? "border-[var(--emerald)] bg-white text-[var(--emerald)]" : "border-[var(--line)] bg-white text-[#9aaca4]"}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span key="done" initial={reduceMotion ? false : { scale: 0.4, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.4 }}><Check size={24} strokeWidth={3} /></motion.span>
          ) : (
            <motion.span key="time" initial={reduceMotion ? false : { scale: 0.6 }} animate={{ scale: 1 }} className="text-xs font-bold tabular">{meal.scheduled_time?.slice(0, 5) ?? "--:--"}</motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <article className={`min-w-0 flex-1 rounded-3xl bg-white p-4 shadow-[var(--card-shadow)] transition sm:p-5 ${done ? "opacity-70" : ""} ${isNext ? "ring-2 ring-[var(--ring)]" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`font-bold ${done ? "text-[var(--muted)] line-through decoration-[#9cc7b1]" : ""}`}>{meal.name}</h3>
            <p className="text-xs text-[var(--muted)]">{meal.scheduled_time ? meal.scheduled_time.slice(0, 5) : "Sem horário"} · {meal.meal_items.length} {meal.meal_items.length === 1 ? "item" : "itens"}</p>
          </div>
          {isNext && !done && <span className="rounded-full bg-[var(--mint)] px-2.5 py-1 text-[11px] font-bold text-[var(--emerald)]">Próxima</span>}
        </div>
        <ul className="mt-3 divide-y divide-[#f0f4f2]">
          {meal.meal_items.map(item => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-[var(--ink)]">{item.description}</span>
              {formatQuantity(item) && <span className="shrink-0 rounded-lg bg-[#f3f7f5] px-2 py-0.5 text-xs font-semibold text-[#40554c] tabular">{formatQuantity(item)}</span>}
            </li>
          ))}
        </ul>
        {meal.notes && <p className="mt-2 text-xs text-[var(--muted)]">{meal.notes}</p>}
        {hasSubstitutions && (
          <>
            <button onClick={() => setOpen(value => !value)} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[var(--emerald)]">
              <Repeat2 size={14} />Substituições<ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  {meal.meal_items.filter(item => item.substitutions?.length).map(item => (
                    <li key={item.id} className="mt-2 rounded-xl bg-[#f7faf8] px-3 py-2 text-xs text-[#40554c]">
                      <b className="text-[var(--ink)]">{item.description}</b> pode trocar por: {item.substitutions.join(", ")}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </>
        )}
      </article>
    </li>
  );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--mint)" strokeWidth="6" />
        <motion.circle
          cx="32" cy="32" r={radius} fill="none" stroke="var(--emerald)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - Math.min(1, value)) }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />
      </svg>
      <span className="text-sm font-bold tabular">{label}</span>
    </div>
  );
}
