"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { Apple, ChevronDown, Copy, Dumbbell, GripVertical, Plus, Trash2, X } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { addDays, localDate } from "@/lib/dates";
import {
  archiveWorkoutPlan,
  getPlanTemplates,
  getProfessionalLibrary,
  getProfessionalStudents,
  getStudentPlans,
  publishDiet,
  publishWorkout,
  savePlanTemplate,
  type DietTemplateContent,
  type PlanTemplate,
  type Viewer,
  type WorkoutTemplateContent,
} from "@/lib/evolink-data";
import { Select } from "@/components/ui/select";

type Kind = "workout" | "diet";
type ExerciseRow = { key: string; name: string; muscleGroup: string; sets: string; reps: string; rest: string; load: string; notes: string; videoUrl: string };
type ItemRow = { key: string; description: string; quantity: string; unit: string; substitutions: string };
type MealRow = { key: string; name: string; time: string; items: ItemRow[] };
type StudentOption = { id: string; name: string };

const card = "rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow";
const field = "w-full rounded-xl border border-[#dbe7e0] bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-[#9aaba3] focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";
const label = "text-xs font-bold text-[#52665e]";
const key = () => crypto.randomUUID();

const commonExercises = [
  "Agachamento livre", "Agachamento hack", "Leg press 45°", "Cadeira extensora", "Mesa flexora", "Cadeira flexora", "Stiff", "Levantamento terra",
  "Levantamento terra romeno", "Elevação pélvica", "Afundo", "Búlgaro", "Panturrilha em pé", "Panturrilha sentado", "Supino reto", "Supino inclinado",
  "Supino com halteres", "Crucifixo", "Crossover", "Peck deck", "Paralelas", "Puxada frontal", "Barra fixa", "Remada curvada", "Remada baixa",
  "Remada unilateral", "Pulldown", "Desenvolvimento halter", "Desenvolvimento máquina", "Elevação lateral", "Elevação frontal", "Crucifixo inverso",
  "Face pull", "Rosca direta", "Rosca alternada", "Rosca martelo", "Rosca Scott", "Tríceps pulley", "Tríceps corda", "Tríceps testa", "Tríceps francês",
  "Abdominal supra", "Prancha", "Abdominal infra", "Encolhimento",
];
const muscleGroups = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Quadríceps", "Posterior", "Glúteos", "Panturrilha", "Abdômen", "Corpo inteiro"];

const blankExercise = (): ExerciseRow => ({ key: key(), name: "", muscleGroup: "", sets: "3", reps: "10-12", rest: "60", load: "", notes: "", videoUrl: "" });
const blankItem = (): ItemRow => ({ key: key(), description: "", quantity: "", unit: "g", substitutions: "" });
const blankMeal = (name = "Nova refeição", time = ""): MealRow => ({ key: key(), name, time, items: [blankItem()] });

export function PlanBuilder({ viewer, kind }: { viewer: Viewer; kind: Kind }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentOption[] | null>(null);
  const [studentId, setStudentId] = useState(searchParams.get("aluno") ?? "");
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [library, setLibrary] = useState<string[]>([]);
  const [title, setTitle] = useState(kind === "workout" ? "Treino A" : "Plano alimentar");
  const [summary, setSummary] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [endsOn, setEndsOn] = useState(() => localDate(addDays(kind === "workout" ? 42 : 28)));
  const [exercises, setExercises] = useState<ExerciseRow[]>([blankExercise()]);
  const [meals, setMeals] = useState<MealRow[]>([blankMeal("Café da manhã", "07:00"), blankMeal("Almoço", "12:30"), blankMeal("Jantar", "20:00")]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getProfessionalStudents(viewer.id), getPlanTemplates(viewer.id), kind === "workout" ? getProfessionalLibrary(viewer.id) : Promise.resolve(null)]).then(([rows, templateResult, libraryResult]) => {
      if (!active) return;
      const options = rows.map(row => ({ id: row.student_id, name: (row.profiles as { full_name?: string } | null)?.full_name ?? "Aluno" }));
      setStudents(options);
      setStudentId(current => (options.some(option => option.id === current) ? current : options[0]?.id ?? ""));
      setTemplates(templateResult.data.filter(template => template.kind === kind));
      if (libraryResult) setLibrary(libraryResult.exercises.map(exercise => exercise.name));
    });
    return () => { active = false; };
  }, [viewer.id, kind]);

  const suggestions = useMemo(() => [...new Set([...library, ...commonExercises])].sort((a, b) => a.localeCompare(b, "pt-BR")), [library]);

  function applyTemplate(templateId: string) {
    const template = templates.find(item => item.id === templateId);
    if (!template) return;
    setTitle(template.title);
    if (kind === "workout") {
      const content = template.content as WorkoutTemplateContent;
      setSummary(content.objective ?? "");
      setMinutes(String(content.estimatedMinutes ?? 60));
      setExercises(content.exercises.map(exercise => ({ ...blankExercise(), name: exercise.name, sets: String(exercise.sets), reps: exercise.repetitions, rest: String(exercise.restSeconds) })));
    } else {
      const content = template.content as DietTemplateContent;
      setSummary(content.notes ?? "");
      setMeals(content.meals.map(meal => ({ key: key(), name: meal.name, time: meal.time, items: meal.items.map(item => ({ ...blankItem(), description: item, unit: "" })) })));
    }
  }

  async function publish() {
    setError("");
    if (!studentId) return setError("Escolha um aluno.");
    if (!title.trim()) return setError("Dê um título ao plano.");
    setSaving(true);
    let result: { error: unknown };
    if (kind === "workout") {
      const rows = exercises.filter(row => row.name.trim());
      if (!rows.length) { setSaving(false); return setError("Adicione pelo menos um exercício."); }
      const payload = rows.map(row => ({
        name: row.name.trim(), muscleGroup: row.muscleGroup, sets: Math.max(1, Number(row.sets) || 3), repetitions: row.reps.trim() || "10",
        restSeconds: Math.max(0, Number(row.rest) || 60), load: row.load.trim(), notes: row.notes.trim(), videoUrl: row.videoUrl.trim(),
      }));
      result = await publishWorkout(viewer.id, studentId, { title: title.trim(), objective: summary.trim(), minutes: Number(minutes) || 0, endsOn, exercises: payload });
      if (!result.error && saveAsTemplate)
        await savePlanTemplate(viewer.id, { kind: "workout", title: title.trim(), description: summary.trim(), content: { objective: summary.trim(), estimatedMinutes: Number(minutes) || 0, exercises: payload.map(({ name, sets, repetitions, restSeconds }) => ({ name, sets, repetitions, restSeconds })) } });
    } else {
      const rows = meals.map(meal => ({ ...meal, items: meal.items.filter(item => item.description.trim()) })).filter(meal => meal.name.trim() && meal.items.length);
      if (!rows.length) { setSaving(false); return setError("Adicione pelo menos um alimento."); }
      const payload = rows.map(meal => ({
        name: meal.name.trim(), time: meal.time,
        items: meal.items.map(item => ({
          description: item.description.trim(),
          quantity: item.quantity ? Number(item.quantity.replace(",", ".")) || null : null,
          unit: item.unit.trim(),
          substitutions: item.substitutions.split(";").map(value => value.trim()).filter(Boolean),
        })),
      }));
      result = await publishDiet(viewer.id, studentId, { title: title.trim(), notes: summary.trim(), endsOn, meals: payload });
      if (!result.error && saveAsTemplate)
        await savePlanTemplate(viewer.id, { kind: "diet", title: title.trim(), description: summary.trim(), content: { notes: summary.trim(), meals: payload.map(meal => ({ name: meal.name, time: meal.time, items: meal.items.map(item => [item.quantity, item.unit, item.description].filter(Boolean).join(" ")) })) } });
    }
    setSaving(false);
    if (result.error) return setError("Não foi possível publicar. Tente novamente.");
    setPublished(true);
  }

  const studentName = students?.find(student => student.id === studentId)?.name ?? "aluno";
  const Icon = kind === "workout" ? Dumbbell : Apple;

  if (published)
    return (
      <Shell profile="professional">
        <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className={`${card} mx-auto mt-10 max-w-md text-center`}>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]"><Icon size={26} /></span>
          <h1 className="mt-4 text-2xl font-bold">{kind === "workout" ? "Treino publicado" : "Dieta publicada"}</h1>
          <p className="mt-2 text-sm text-[#71837b]">{studentName} já recebeu uma notificação e pode ver o plano no app.</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => router.push(`/profissional/alunos/${studentId}`)}>Ver ficha do aluno</Button>
            <Button kind="outline" onClick={() => { setPublished(false); if (kind === "workout") { setTitle(nextWorkoutTitle(title)); setExercises([blankExercise()]); } }}>
              {kind === "workout" ? "Montar outro treino" : "Voltar ao editor"}
            </Button>
          </div>
        </motion.section>
      </Shell>
    );

  return (
    <Shell profile="professional">
      <PageTitle
        kicker={kind === "workout" ? "TREINOS" : "DIETAS"}
        title={kind === "workout" ? "Montar treino" : "Montar dieta"}
        text={kind === "workout" ? "Monte os exercícios, reordene arrastando e publique para o aluno." : "Organize refeições, quantidades e substituições."}
      />

      <div className="mt-7 grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className={card}>
            <Select label="Aluno" value={studentId} onChange={setStudentId} disabled={!students?.length} placeholder={students === null ? "Carregando..." : "Nenhum aluno ativo"} options={(students ?? []).map(student => ({ value: student.id, label: student.name }))} />
            {templates.length > 0 && (
              <Select label="Começar de um modelo" className="mt-4" value="" placeholder="Escolher modelo" onChange={applyTemplate} options={templates.map(template => ({ value: template.id, label: template.title }))} />
            )}
            <label className={`${label} mt-4 block`}>Título<input value={title} onChange={event => setTitle(event.target.value)} className={`${field} mt-1.5`} /></label>
            <label className={`${label} mt-4 block`}>{kind === "workout" ? "Objetivo" : "Orientações gerais"}
              <textarea value={summary} onChange={event => setSummary(event.target.value)} placeholder={kind === "workout" ? "Ex.: Hipertrofia de membros inferiores" : "Ex.: Beber 3 L de água, evitar frituras"} className={`${field} mt-1.5 min-h-20`} />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {kind === "workout" && <label className={label}>Duração (min)<input value={minutes} onChange={event => setMinutes(event.target.value)} inputMode="numeric" className={`${field} mt-1.5`} /></label>}
              <label className={`${label} ${kind === "diet" ? "col-span-2" : ""}`}>Válido até<input type="date" value={endsOn} onChange={event => setEndsOn(event.target.value)} className={`${field} mt-1.5`} /></label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-[#52665e]">
              <input type="checkbox" checked={saveAsTemplate} onChange={event => setSaveAsTemplate(event.target.checked)} className="accent-[#087a50]" />Salvar também como modelo
            </label>
            {error && <p className="mt-4 text-sm font-semibold text-[#b94242]">{error}</p>}
            <Button onClick={publish} disabled={saving || !students?.length} className="mt-5 w-full">{saving ? "Publicando..." : kind === "workout" ? "Publicar treino" : "Publicar dieta"}</Button>
            {kind === "diet" && <p className="mt-2 text-center text-xs text-[#71837b]">A dieta atual do aluno será substituída.</p>}
          </section>
          {kind === "workout" && studentId && <ActiveWorkouts professionalId={viewer.id} studentId={studentId} />}
        </aside>

        <section>
          {kind === "workout" ? (
            <ExerciseList rows={exercises} onChange={setExercises} suggestions={suggestions} />
          ) : (
            <MealList rows={meals} onChange={setMeals} />
          )}
        </section>
      </div>
    </Shell>
  );
}

function ActiveWorkouts({ professionalId, studentId }: { professionalId: string; studentId: string }) {
  const [plans, setPlans] = useState<{ id: string; title: string; count: number }[] | null>(null);
  useEffect(() => {
    let active = true;
    getStudentPlans(professionalId, studentId).then(result => {
      if (active) setPlans(result.workouts.map(plan => ({ id: plan.id, title: plan.title, count: plan.workout_exercises?.length ?? 0 })));
    });
    return () => { active = false; };
  }, [professionalId, studentId]);
  if (!plans?.length) return null;
  return (
    <section className={card}>
      <p className={label}>TREINOS ATIVOS DO ALUNO</p>
      <p className="mt-1 text-xs text-[#71837b]">O novo treino entra na rotação junto com estes.</p>
      <ul className="mt-3 space-y-2">
        {plans.map(plan => (
          <li key={plan.id} className="flex items-center gap-2 rounded-xl bg-[#f7faf8] px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{plan.title}<span className="ml-1 text-xs font-normal text-[#71837b]">· {plan.count} ex.</span></span>
            <button
              onClick={async () => { const { error } = await archiveWorkoutPlan(plan.id); if (!error) setPlans(current => (current ?? []).filter(item => item.id !== plan.id)); }}
              className="rounded-lg px-2 py-1 text-xs font-bold text-[#b94242] hover:bg-[#fdebea]"
            >
              Encerrar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExerciseList({ rows, onChange, suggestions }: { rows: ExerciseRow[]; onChange: (rows: ExerciseRow[]) => void; suggestions: string[] }) {
  const update = (rowKey: string, patch: Partial<ExerciseRow>) => onChange(rows.map(row => (row.key === rowKey ? { ...row, ...patch } : row)));
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Exercícios <span className="text-sm font-normal text-[#71837b]">({rows.filter(row => row.name.trim()).length})</span></h2>
        <Button kind="soft" className="px-3 py-2 text-xs" onClick={() => onChange([...rows, blankExercise()])}><Plus size={15} />Exercício</Button>
      </div>
      <datalist id="exercise-suggestions">{suggestions.map(name => <option key={name} value={name} />)}</datalist>
      <Reorder.Group axis="y" values={rows} onReorder={onChange} className="mt-4 space-y-3">
        <AnimatePresence initial={false}>
          {rows.map((row, index) => (
            <ExerciseItem
              key={row.key}
              row={row}
              index={index}
              onChange={patch => update(row.key, patch)}
              onDuplicate={() => onChange([...rows.slice(0, index + 1), { ...row, key: key() }, ...rows.slice(index + 1)])}
              onRemove={() => onChange(rows.length > 1 ? rows.filter(item => item.key !== row.key) : [blankExercise()])}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
}

function ExerciseItem({ row, index, onChange, onDuplicate, onRemove }: { row: ExerciseRow; index: number; onChange: (patch: Partial<ExerciseRow>) => void; onDuplicate: () => void; onRemove: () => void }) {
  const controls = useDragControls();
  const [open, setOpen] = useState(Boolean(row.notes || row.videoUrl));
  const set = (name: keyof ExerciseRow) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange({ [name]: event.target.value });
  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 30px rgba(7,53,43,.12)" }}
      className="rounded-2xl border border-[#e2ece6] bg-[#fbfdfc] p-3"
    >
      <div className="flex items-start gap-2">
        <button type="button" onPointerDown={event => controls.start(event)} aria-label="Arrastar para reordenar" className="mt-2 cursor-grab touch-none text-[#9aaba3] active:cursor-grabbing">
          <GripVertical size={18} />
        </button>
        <span className="mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#087a50] text-xs font-bold text-white">{index + 1}</span>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_150px]">
          <input value={row.name} onChange={set("name")} list="exercise-suggestions" placeholder="Nome do exercício" className={`${field} font-semibold`} />
          <Select value={row.muscleGroup} onChange={muscleGroup => onChange({ muscleGroup })} placeholder="Grupo muscular" options={muscleGroups.map(group => ({ value: group, label: group }))} />
          <div className="grid grid-cols-4 gap-2 sm:col-span-2">
            <label className={label}>Séries<input value={row.sets} onChange={set("sets")} inputMode="numeric" className={`${field} mt-1`} /></label>
            <label className={label}>Reps<input value={row.reps} onChange={set("reps")} placeholder="8-10" className={`${field} mt-1`} /></label>
            <label className={label}>Descanso (s)<input value={row.rest} onChange={set("rest")} inputMode="numeric" className={`${field} mt-1`} /></label>
            <label className={label}>Carga<input value={row.load} onChange={set("load")} placeholder="Ex.: 20 kg" className={`${field} mt-1`} /></label>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid gap-2 overflow-hidden sm:col-span-2 sm:grid-cols-2">
                <input value={row.notes} onChange={set("notes")} placeholder="Técnica / observações (ex.: cadência 3-0-1)" className={field} />
                <input value={row.videoUrl} onChange={set("videoUrl")} placeholder="Link do vídeo (opcional)" className={field} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col gap-1">
          <IconButton label="Mais opções" onClick={() => setOpen(value => !value)}><ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} /></IconButton>
          <IconButton label="Duplicar exercício" onClick={onDuplicate}><Copy size={15} /></IconButton>
          <IconButton label="Remover exercício" onClick={onRemove} danger><Trash2 size={15} /></IconButton>
        </div>
      </div>
    </Reorder.Item>
  );
}

function MealList({ rows, onChange }: { rows: MealRow[]; onChange: (rows: MealRow[]) => void }) {
  const update = (mealKey: string, patch: Partial<MealRow>) => onChange(rows.map(meal => (meal.key === mealKey ? { ...meal, ...patch } : meal)));
  return (
    <div className="space-y-3">
      <Reorder.Group axis="y" values={rows} onReorder={onChange} className="space-y-3">
        <AnimatePresence initial={false}>
          {rows.map(meal => <MealItem key={meal.key} meal={meal} onChange={patch => update(meal.key, patch)} onRemove={() => onChange(rows.filter(item => item.key !== meal.key))} />)}
        </AnimatePresence>
      </Reorder.Group>
      <button type="button" onClick={() => onChange([...rows, blankMeal()])} className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[#cfe3d8] py-4 text-sm font-bold text-[#52665e] transition hover:border-[#087a50] hover:bg-[#f3faf6]">
        <Plus size={17} />Adicionar refeição
      </button>
    </div>
  );
}

function MealItem({ meal, onChange, onRemove }: { meal: MealRow; onChange: (patch: Partial<MealRow>) => void; onRemove: () => void }) {
  const controls = useDragControls();
  const updateItem = (itemKey: string, patch: Partial<ItemRow>) => onChange({ items: meal.items.map(item => (item.key === itemKey ? { ...item, ...patch } : item)) });
  return (
    <Reorder.Item value={meal} dragListener={false} dragControls={controls} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} whileDrag={{ scale: 1.01 }} className={card}>
      <div className="flex items-center gap-2">
        <button type="button" onPointerDown={event => controls.start(event)} aria-label="Arrastar refeição" className="cursor-grab touch-none text-[#9aaba3]"><GripVertical size={18} /></button>
        <input value={meal.name} onChange={event => onChange({ name: event.target.value })} placeholder="Nome da refeição" className={`${field} font-bold`} />
        <input type="time" value={meal.time} onChange={event => onChange({ time: event.target.value })} className={`${field} w-32 shrink-0`} />
        <IconButton label="Remover refeição" onClick={onRemove} danger><X size={16} /></IconButton>
      </div>
      <div className="mt-3 space-y-2">
        <div className="hidden grid-cols-[1fr_80px_80px_1fr_32px] gap-2 px-1 text-[11px] font-bold uppercase tracking-wide text-[#91a39b] md:grid">
          <span>Alimento</span><span>Qtd.</span><span>Unid.</span><span>Substituições (separe com ;)</span><span />
        </div>
        <AnimatePresence initial={false}>
          {meal.items.map(item => (
            <motion.div key={item.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-[1fr_70px_70px_32px] gap-2 md:grid-cols-[1fr_80px_80px_1fr_32px]">
              <input value={item.description} onChange={event => updateItem(item.key, { description: event.target.value })} placeholder="Ex.: Arroz branco" className={field} />
              <input value={item.quantity} onChange={event => updateItem(item.key, { quantity: event.target.value })} inputMode="decimal" placeholder="150" className={field} />
              <input value={item.unit} onChange={event => updateItem(item.key, { unit: event.target.value })} placeholder="g" className={field} />
              <input value={item.substitutions} onChange={event => updateItem(item.key, { substitutions: event.target.value })} placeholder="Ex.: 200 g de batata" className={`${field} col-span-3 row-start-2 md:col-span-1 md:row-start-auto`} />
              <IconButton label="Remover alimento" onClick={() => onChange({ items: meal.items.length > 1 ? meal.items.filter(entry => entry.key !== item.key) : [blankItem()] })} danger><Trash2 size={15} /></IconButton>
            </motion.div>
          ))}
        </AnimatePresence>
        <button type="button" onClick={() => onChange({ items: [...meal.items, blankItem()] })} className="flex items-center gap-1.5 px-1 py-1 text-sm font-bold text-[#087a50]"><Plus size={15} />Alimento</button>
      </div>
    </Reorder.Item>
  );
}

function IconButton({ label: text, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={text} title={text} onClick={onClick} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#91a39b] transition ${danger ? "hover:bg-[#fdebea] hover:text-[#b94242]" : "hover:bg-[#eef6f1] hover:text-[#087a50]"}`}>
      {children}
    </button>
  );
}

/** "Treino A" -> "Treino B", so building a split is quick. */
function nextWorkoutTitle(title: string) {
  const match = title.match(/^(.*\b)([A-Y])(\b.*)$/);
  return match ? `${match[1]}${String.fromCharCode(match[2].charCodeAt(0) + 1)}${match[3]}` : title;
}
