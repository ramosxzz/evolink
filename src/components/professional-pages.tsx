"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Apple,
  AlertCircle,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  CircleDollarSign,
  Dumbbell,
  FileText,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Settings,
  Trash2,
  UserRound,
  Video,
} from "lucide-react";
import { Avatar, Button, PageTitle, Shell } from "@/components/app-shell";
import {
  applyPlanTemplate,
  createFinanceCharge,
  deletePlanTemplate,
  getPlanTemplates,
  getFinanceData,
  getProfessionalLibrary,
  getPublishedProtocols,
  getProfessionalSettings,
  getProfessionalStudents,
  markFinancePaymentPaid,
  savePlanTemplate,
  saveProfessionalSettings,
  sendPaymentReminder,
  setStudentAccess,
  type FinanceRow,
  type DietTemplateContent,
  type PlanTemplate,
  type PlanTemplateInput,
  type PublishedProtocol,
  type Viewer,
  type WorkoutTemplateContent,
} from "@/lib/evolink-data";
import { localDate } from "@/lib/dates";
import { Modal } from "@/components/ui/modal";

const card = "rounded-3xl border border-[#e2ece6] bg-white soft-shadow";
const field = "mt-2 w-full rounded-xl border border-[#dbe7e0] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#9aaba3] focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed bottom-24 left-1/2 z-[70] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-[#173f34] px-4 py-3 text-sm font-semibold text-white shadow-xl"
    >
      <CheckCircle2 size={17} className="shrink-0 text-[#b8e986]" />
      {message}
    </motion.div>
  );
}

function Dialog({ title, description, onClose, children, wide = false }: { title: string; description?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <Modal open onClose={onClose} title={title} description={description} size={wide ? "lg" : "md"}>{children}</Modal>;
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-bold text-[#284c42]">{label}</span>{children}</label>;
}

const defaultWorkout = (): WorkoutTemplateContent => ({
  objective: "",
  estimatedMinutes: 45,
  exercises: [{ name: "", sets: 3, repetitions: "10-12", restSeconds: 60 }],
});

const defaultDiet = (): DietTemplateContent => ({
  notes: "",
  meals: [{ name: "Café da manhã", time: "07:00", items: [""] }],
});

function TemplateEditor({ professionalId, initial, defaultKind, onClose, onSaved, onDeleted }: {
  professionalId: string;
  initial: PlanTemplate | null;
  defaultKind: "workout" | "diet";
  onClose: () => void;
  onSaved: (message: string) => void;
  onDeleted: (message: string) => void;
}) {
  const [kind, setKind] = useState<"workout" | "diet">(initial?.kind ?? defaultKind);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [workout, setWorkout] = useState<WorkoutTemplateContent>(initial?.kind === "workout" ? initial.content as WorkoutTemplateContent : defaultWorkout());
  const [diet, setDiet] = useState<DietTemplateContent>(initial?.kind === "diet" ? initial.content as DietTemplateContent : defaultDiet());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim()) return setError("Informe um nome para o modelo.");
    if (kind === "workout" && workout.exercises.some(exercise => !exercise.name.trim())) return setError("Preencha o nome de todos os exercícios.");
    if (kind === "diet" && diet.meals.some(meal => !meal.name.trim() || meal.items.every(item => !item.trim()))) return setError("Cada refeição precisa de nome e ao menos um item.");
    setSaving(true);
    const content = kind === "workout"
      ? { ...workout, exercises: workout.exercises.map(exercise => ({ ...exercise, name: exercise.name.trim() })) }
      : { ...diet, meals: diet.meals.map(meal => ({ ...meal, items: meal.items.map(item => item.trim()).filter(Boolean) })) };
    const { error: saveError } = await savePlanTemplate(professionalId, { kind, title, description, content } as PlanTemplateInput, initial?.id);
    setSaving(false);
    if (saveError) return setError(saveError.message);
    onSaved(initial ? "Modelo atualizado com sucesso." : "Novo modelo salvo com sucesso.");
  }

  async function remove() {
    if (!initial || !window.confirm(`Excluir o modelo "${initial.title}"?`)) return;
    setSaving(true);
    const { error: removeError } = await deletePlanTemplate(professionalId, initial.id);
    setSaving(false);
    if (removeError) return setError(removeError.message);
    onDeleted("Modelo excluído.");
  }

  return (
    <Dialog title={initial ? "Editar modelo" : "Novo modelo"} description="As alterações ficam disponíveis apenas para sua conta profissional." onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        {!initial && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#eaf2ed] p-1.5">
            <button type="button" onClick={() => setKind("workout")} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${kind === "workout" ? "bg-white text-[#087a50] shadow-sm" : "text-[#61756d]"}`}><Dumbbell size={17} /> Treino</button>
            <button type="button" onClick={() => setKind("diet")} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${kind === "diet" ? "bg-white text-[#087a50] shadow-sm" : "text-[#61756d]"}`}><Apple size={17} /> Dieta</button>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <FieldLabel label="Nome do modelo"><input className={field} value={title} onChange={event => setTitle(event.target.value)} placeholder={kind === "workout" ? "Ex.: Hipertrofia para iniciantes" : "Ex.: Redução de gordura"} /></FieldLabel>
          <FieldLabel label="Descrição"><input className={field} value={description ?? ""} onChange={event => setDescription(event.target.value)} placeholder="Quando usar este modelo" /></FieldLabel>
        </div>

        {kind === "workout" ? (
          <section className="rounded-2xl border border-[#e0eae4] bg-white p-4 md:p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <FieldLabel label="Objetivo"><input className={field} value={workout.objective} onChange={event => setWorkout(value => ({ ...value, objective: event.target.value }))} placeholder="Hipertrofia, força, adaptação" /></FieldLabel>
              <FieldLabel label="Duração estimada"><input type="number" min={5} max={300} className={field} value={workout.estimatedMinutes} onChange={event => setWorkout(value => ({ ...value, estimatedMinutes: Number(event.target.value) }))} /></FieldLabel>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3"><div><h3 className="font-bold">Exercícios</h3><p className="text-xs text-[#71837b]">Ordem e prescrição base do treino</p></div><Button type="button" kind="soft" className="px-3 py-2" onClick={() => setWorkout(value => ({ ...value, exercises: [...value.exercises, { name: "", sets: 3, repetitions: "10-12", restSeconds: 60 }] }))}><Plus size={15} /> Adicionar</Button></div>
            <div className="mt-3 space-y-3">
              {workout.exercises.map((exercise, index) => (
                <div key={index} className="grid gap-3 rounded-2xl bg-[#f5f9f7] p-3 md:grid-cols-[minmax(180px,1fr)_80px_110px_95px_40px] md:items-end">
                  <FieldLabel label="Exercício"><input className={field} value={exercise.name} onChange={event => setWorkout(value => ({ ...value, exercises: value.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} placeholder="Nome do exercício" /></FieldLabel>
                  <FieldLabel label="Séries"><input type="number" min={1} max={20} className={field} value={exercise.sets} onChange={event => setWorkout(value => ({ ...value, exercises: value.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, sets: Number(event.target.value) } : item) }))} /></FieldLabel>
                  <FieldLabel label="Repetições"><input className={field} value={exercise.repetitions} onChange={event => setWorkout(value => ({ ...value, exercises: value.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, repetitions: event.target.value } : item) }))} /></FieldLabel>
                  <FieldLabel label="Descanso"><input type="number" min={0} max={900} className={field} value={exercise.restSeconds} onChange={event => setWorkout(value => ({ ...value, exercises: value.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, restSeconds: Number(event.target.value) } : item) }))} /></FieldLabel>
                  <button type="button" aria-label="Remover exercício" disabled={workout.exercises.length === 1} onClick={() => setWorkout(value => ({ ...value, exercises: value.exercises.filter((_, itemIndex) => itemIndex !== index) }))} className="mb-0.5 grid h-10 w-10 place-items-center rounded-xl text-[#b94242] transition hover:bg-[#fdebea] disabled:opacity-30"><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-[#e0eae4] bg-white p-4 md:p-5">
            <FieldLabel label="Orientações gerais"><textarea rows={2} className={field} value={diet.notes} onChange={event => setDiet(value => ({ ...value, notes: event.target.value }))} placeholder="Orientações que devem acompanhar o plano" /></FieldLabel>
            <div className="mt-5 flex items-center justify-between gap-3"><div><h3 className="font-bold">Refeições</h3><p className="text-xs text-[#71837b]">Uma opção alimentar por linha</p></div><Button type="button" kind="soft" className="px-3 py-2" onClick={() => setDiet(value => ({ ...value, meals: [...value.meals, { name: "Nova refeição", time: "", items: [""] }] }))}><Plus size={15} /> Adicionar</Button></div>
            <div className="mt-3 space-y-3">
              {diet.meals.map((meal, index) => (
                <div key={index} className="rounded-2xl bg-[#f5f9f7] p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_130px_40px] sm:items-end">
                    <FieldLabel label="Refeição"><input className={field} value={meal.name} onChange={event => setDiet(value => ({ ...value, meals: value.meals.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /></FieldLabel>
                    <FieldLabel label="Horário"><input type="time" className={field} value={meal.time} onChange={event => setDiet(value => ({ ...value, meals: value.meals.map((item, itemIndex) => itemIndex === index ? { ...item, time: event.target.value } : item) }))} /></FieldLabel>
                    <button type="button" aria-label="Remover refeição" disabled={diet.meals.length === 1} onClick={() => setDiet(value => ({ ...value, meals: value.meals.filter((_, itemIndex) => itemIndex !== index) }))} className="mb-0.5 grid h-10 w-10 place-items-center rounded-xl text-[#b94242] transition hover:bg-[#fdebea] disabled:opacity-30"><Trash2 size={17} /></button>
                  </div>
                  <FieldLabel label="Alimentos"><textarea rows={3} className={field} value={meal.items.join("\n")} onChange={event => setDiet(value => ({ ...value, meals: value.meals.map((item, itemIndex) => itemIndex === index ? { ...item, items: event.target.value.split("\n") } : item) }))} placeholder={"2 ovos mexidos\n1 fatia de pão integral"} /></FieldLabel>
                </div>
              ))}
            </div>
          </section>
        )}

        {error && <p role="alert" className="rounded-xl bg-[#fdebea] px-4 py-3 text-sm font-semibold text-[#a33c3c]">{error}</p>}
        <div className="flex flex-col-reverse gap-3 border-t border-[#e3ece7] pt-5 sm:flex-row sm:justify-between">
          {initial ? <Button type="button" kind="outline" disabled={saving} onClick={() => void remove()} className="text-[#b94242]"><Trash2 size={16} /> Excluir modelo</Button> : <span />}
          <div className="flex gap-3"><Button type="button" kind="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving} className="min-w-36"><Save size={16} /> {saving ? "Salvando..." : "Salvar modelo"}</Button></div>
        </div>
      </form>
    </Dialog>
  );
}

type StudentOption = { id: string; name: string; goal: string };

function ApplyDialog({ template, students, onClose, onApplied }: { template: PlanTemplate; students: StudentOption[]; onClose: () => void; onApplied: (message: string) => void }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function apply() {
    if (!studentId) return setError("Selecione um aluno.");
    setSaving(true);
    const { error: applyError } = await applyPlanTemplate(template, studentId);
    setSaving(false);
    if (applyError) return setError(applyError.message);
    const student = students.find(item => item.id === studentId);
    onApplied(`${template.kind === "workout" ? "Treino" : "Dieta"} aplicado a ${student?.name ?? "aluno"}.`);
  }
  return (
    <Dialog title="Aplicar modelo a aluno" description="Uma cópia publicada será criada na ficha do aluno." onClose={onClose}>
      {students.length === 0 ? <div className="rounded-2xl bg-[#f0f6f3] p-5 text-sm text-[#61756d]">Nenhum aluno ativo está vinculado à sua conta.</div> : <div className="space-y-3">{students.map(student => <button key={student.id} type="button" onClick={() => setStudentId(student.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition active:scale-[.99] ${studentId === student.id ? "border-[#087a50] bg-[#edf8f2] ring-2 ring-[#d8efe2]" : "border-[#e1ebe5] bg-white hover:border-[#bcd7c8]"}`}><Avatar name={student.name} /><span className="min-w-0"><b className="block truncate">{student.name}</b><span className="text-sm text-[#71837b]">{student.goal || "Objetivo não informado"}</span></span>{studentId === student.id && <CheckCircle2 className="ml-auto text-[#087a50]" size={20} />}</button>)}</div>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fdebea] px-4 py-3 text-sm font-semibold text-[#a33c3c]">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><Button kind="outline" onClick={onClose}>Cancelar</Button><Button disabled={saving || !studentId} onClick={() => void apply()}><Copy size={16} /> {saving ? "Aplicando..." : "Aplicar modelo"}</Button></div>
    </Dialog>
  );
}

function ProtocolDialog({ professionalId, onClose, onCreated }: { professionalId: string; onClose: () => void; onCreated: (message: string) => void }) {
  const [protocols, setProtocols] = useState<PublishedProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    getPublishedProtocols(professionalId).then(result => { setProtocols(result.data); setError(result.error?.message ?? ""); setLoading(false); });
  }, [professionalId]);
  async function duplicate(protocol: PublishedProtocol) {
    setSavingId(protocol.id);
    const { error: saveError } = await savePlanTemplate(professionalId, {
      kind: protocol.kind,
      title: `${protocol.title} - cópia`,
      description: `Criado a partir do protocolo de ${protocol.studentName}`,
      content: protocol.content,
    });
    setSavingId("");
    if (saveError) return setError(saveError.message);
    onCreated("Protocolo copiado para seus modelos.");
  }
  return (
    <Dialog title="Duplicar protocolo" description="Escolha um plano publicado e transforme-o em um modelo editável." onClose={onClose} wide>
      {loading ? <div className="space-y-3 animate-pulse">{[1, 2, 3].map(item => <div key={item} className="h-20 rounded-2xl bg-[#eaf2ed]" />)}</div> : protocols.length === 0 ? <div className="rounded-2xl bg-[#f0f6f3] p-6 text-center"><FileText className="mx-auto text-[#087a50]" /><h3 className="mt-3 font-bold">Nenhum protocolo publicado</h3><p className="mt-1 text-sm text-[#71837b]">Publique um treino ou uma dieta para poder reutilizá-lo aqui.</p></div> : <div className="grid gap-3 md:grid-cols-2">{protocols.map(protocol => <article key={`${protocol.kind}-${protocol.id}`} className="rounded-2xl border border-[#e1ebe5] bg-white p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f4ec] text-[#087a50]">{protocol.kind === "workout" ? <Dumbbell size={18} /> : <Apple size={18} />}</span><div className="min-w-0"><h3 className="truncate font-bold">{protocol.title}</h3><p className="mt-0.5 text-sm text-[#71837b]">Aluno: {protocol.studentName}</p></div></div><Button kind="soft" className="mt-4 w-full py-2.5" disabled={savingId === protocol.id} onClick={() => void duplicate(protocol)}><Copy size={15} /> {savingId === protocol.id ? "Copiando..." : "Criar modelo"}</Button></article>)}</div>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fdebea] px-4 py-3 text-sm font-semibold text-[#a33c3c]">{error}</p>}
    </Dialog>
  );
}

export function ProfessionalTemplatesPage({ viewer }: { viewer: Viewer }) {
  const [kind, setKind] = useState<"workout" | "diet">("workout");
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<PlanTemplate | "new" | null>(null);
  const [applying, setApplying] = useState<PlanTemplate | null>(null);
  const [protocolsOpen, setProtocolsOpen] = useState(false);
  const [toast, setToast] = useState("");

  async function refresh() {
    if (!viewer.professionalId) return;
    const [templateResult, studentRows] = await Promise.all([getPlanTemplates(viewer.professionalId), getProfessionalStudents(viewer.professionalId)]);
    setTemplates(templateResult.data);
    setError(templateResult.error?.message ?? "");
    setStudents((studentRows ?? []).map(row => {
      const profile = row.profiles as unknown as { id?: string; full_name?: string } | null;
      const studentProfile = row.student_profiles as unknown as { goal?: string | null } | null;
      return { id: row.student_id, name: profile?.full_name ?? "Aluno", goal: studentProfile?.goal ?? "" };
    }));
    setLoading(false);
  }

  useEffect(() => {
    if (!viewer.professionalId) return;
    let active = true;
    Promise.all([getPlanTemplates(viewer.professionalId), getProfessionalStudents(viewer.professionalId)]).then(([templateResult, studentRows]) => {
      if (!active) return;
      setTemplates(templateResult.data);
      setError(templateResult.error?.message ?? "");
      setStudents((studentRows ?? []).map(row => {
        const profile = row.profiles as unknown as { id?: string; full_name?: string } | null;
        const studentProfile = row.student_profiles as unknown as { goal?: string | null } | null;
        return { id: row.student_id, name: profile?.full_name ?? "Aluno", goal: studentProfile?.goal ?? "" };
      }));
      setLoading(false);
    });
    return () => { active = false; };
  }, [viewer.professionalId]);
  const visible = templates.filter(template => template.kind === kind);
  const closeAndRefresh = (message: string) => { setEditor(null); setApplying(null); setProtocolsOpen(false); setToast(message); setLoading(true); void refresh(); };

  return (
    <Shell profile="professional">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle kicker="MODELOS" title="Crie uma vez. Personalize sempre." text="Salve estruturas, edite quando quiser e aplique uma cópia a qualquer aluno." />
        <Button onClick={() => setEditor("new")}><Plus size={17} /> Novo modelo</Button>
      </div>
      <div className="mt-6 inline-flex rounded-xl bg-[#eaf2ed] p-1">
        <button onClick={() => setKind("workout")} className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${kind === "workout" ? "bg-white text-[#173f34] shadow-sm" : "text-[#61756d]"}`}>Treinos</button>
        <button onClick={() => setKind("diet")} className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${kind === "diet" ? "bg-white text-[#173f34] shadow-sm" : "text-[#61756d]"}`}>Dietas</button>
      </div>

      {loading ? <div className="mt-5 grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-64 rounded-3xl bg-[#e9f1ed]" />)}</div> : error ? <div className="mt-5 rounded-2xl bg-[#fdebea] p-5 text-sm font-semibold text-[#a33c3c]">Não foi possível carregar os modelos: {error}</div> : visible.length === 0 ? <section className={`${card} mt-5 grid min-h-64 place-items-center p-7 text-center`}><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]">{kind === "workout" ? <Dumbbell /> : <Apple />}</span><h2 className="mt-4 text-xl font-bold">Nenhum modelo de {kind === "workout" ? "treino" : "dieta"}</h2><p className="mx-auto mt-2 max-w-md text-sm text-[#71837b]">Crie o primeiro modelo do zero ou transforme um protocolo publicado em uma estrutura reutilizável.</p><Button className="mt-5" onClick={() => setEditor("new")}><Plus size={16} /> Criar primeiro modelo</Button></div></section> : <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(template => {
        const detail = template.kind === "workout" ? `${(template.content as WorkoutTemplateContent).exercises?.length ?? 0} exercícios` : `${(template.content as DietTemplateContent).meals?.length ?? 0} refeições`;
        return <motion.article layout whileHover={{ y: -2 }} key={template.id} className={`${card} p-5`}><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]">{template.kind === "workout" ? <Dumbbell size={20} /> : <Apple size={20} />}</span><h2 className="mt-5 font-bold">{template.title}</h2><p className="mt-1 text-sm text-[#52665e]">{detail}</p>{template.description && <p className="mt-2 line-clamp-2 text-sm text-[#71837b]">{template.description}</p>}<p className="mt-3 text-xs text-[#91a39b]">Usado {template.use_count} {template.use_count === 1 ? "vez" : "vezes"}</p><div className="mt-5 flex gap-2"><Button kind="soft" className="flex-1 py-2.5" onClick={() => setApplying(template)}><Copy size={15} /> Aplicar a aluno</Button><Button kind="outline" className="px-3 py-2.5" onClick={() => setEditor(template)}><ChevronRight size={16} /></Button></div></motion.article>;
      })}</div>}

      <section className="mt-6 rounded-3xl bg-[#173f34] p-6 text-white">
        <Copy className="text-[#b8e986]" />
        <h2 className="mt-4 text-xl font-bold">Duplicar de outro aluno</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-100">Escolha um protocolo publicado, transforme-o em modelo e personalize antes de aplicar novamente.</p>
        <Button kind="soft" className="mt-5" onClick={() => setProtocolsOpen(true)}>Escolher protocolo</Button>
      </section>

      <AnimatePresence>
        {editor && viewer.professionalId && <TemplateEditor professionalId={viewer.professionalId} initial={editor === "new" ? null : editor} defaultKind={kind} onClose={() => setEditor(null)} onSaved={closeAndRefresh} onDeleted={closeAndRefresh} />}
        {applying && <ApplyDialog template={applying} students={students} onClose={() => setApplying(null)} onApplied={closeAndRefresh} />}
        {protocolsOpen && viewer.professionalId && <ProtocolDialog professionalId={viewer.professionalId} onClose={() => setProtocolsOpen(false)} onCreated={closeAndRefresh} />}
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </Shell>
  );
}

export function ProfessionalSettingsPage({ viewer }: { viewer: Viewer }) {
  const [values, setValues] = useState({ fullName: "", phone: "", specialty: "", registrationNumber: "", bio: "", email: "", planUpdateNotifications: true, checkinReminders: true, quietHoursStart: "22:00", quietHoursEnd: "07:00" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!viewer.professionalId) return;
    getProfessionalSettings(viewer.professionalId).then(result => {
      if (result.error) setError(result.error.message);
      setValues(current => ({
        ...current,
        fullName: result.profile?.full_name ?? viewer.fullName,
        phone: result.profile?.phone ?? "",
        specialty: result.professional?.specialty ?? "",
        registrationNumber: result.professional?.registration_number ?? "",
        bio: result.professional?.bio ?? "",
        email: result.email,
        planUpdateNotifications: result.preferences?.plan_update_notifications ?? true,
        checkinReminders: result.preferences?.checkin_reminders ?? true,
        quietHoursStart: result.preferences?.quiet_hours_start?.slice(0, 5) ?? "22:00",
        quietHoursEnd: result.preferences?.quiet_hours_end?.slice(0, 5) ?? "07:00",
      }));
      setLoading(false);
    });
  }, [viewer.fullName, viewer.professionalId]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!viewer.professionalId || !values.fullName.trim()) return;
    setSaving(true); setError("");
    const { error: saveError } = await saveProfessionalSettings(viewer.professionalId, values);
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setToast("Configurações salvas com sucesso.");
  }
  const toggle = (key: "planUpdateNotifications" | "checkinReminders", label: string, description: string) => <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e4ece7] bg-white p-4"><div><p className="font-bold">{label}</p><p className="mt-1 text-sm text-[#71837b]">{description}</p></div><button type="button" role="switch" aria-checked={values[key]} onClick={() => setValues(current => ({ ...current, [key]: !current[key] }))} className={`relative h-7 w-12 shrink-0 rounded-full transition ${values[key] ? "bg-[#087a50]" : "bg-[#cbd8d1]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${values[key] ? "translate-x-6" : "translate-x-1"}`} /></button></div>;
  return (
    <Shell profile="professional">
      <PageTitle kicker="PREFERÊNCIAS" title="Configurações" text="Gerencie seu perfil profissional, conta e notificações." />
      {loading ? <div className="mt-6 grid animate-pulse gap-5 xl:grid-cols-[1.2fr_.8fr]"><div className="h-96 rounded-3xl bg-[#e9f1ed]" /><div className="h-80 rounded-3xl bg-[#e9f1ed]" /></div> : <form onSubmit={submit} className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className={`${card} p-5 md:p-6`}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]"><UserRound size={20} /></span><div><h2 className="text-lg font-bold">Perfil profissional</h2><p className="text-sm text-[#71837b]">Informações exibidas no acompanhamento dos alunos</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-2"><FieldLabel label="Nome completo"><input className={field} value={values.fullName} onChange={event => setValues(current => ({ ...current, fullName: event.target.value }))} /></FieldLabel><FieldLabel label="Telefone"><input className={field} value={values.phone} onChange={event => setValues(current => ({ ...current, phone: event.target.value }))} placeholder="(00) 00000-0000" /></FieldLabel><FieldLabel label="Especialidade"><input className={field} value={values.specialty} onChange={event => setValues(current => ({ ...current, specialty: event.target.value }))} placeholder="Nutrição esportiva, treinamento..." /></FieldLabel><FieldLabel label="Registro profissional"><input className={field} value={values.registrationNumber} onChange={event => setValues(current => ({ ...current, registrationNumber: event.target.value }))} placeholder="CRN, CREF ou outro" /></FieldLabel></div><FieldLabel label="Apresentação"><textarea rows={4} className={field} value={values.bio} onChange={event => setValues(current => ({ ...current, bio: event.target.value }))} placeholder="Conte brevemente como você trabalha" /></FieldLabel></section>
        <div className="space-y-5"><section className={`${card} p-5`}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]"><Settings size={20} /></span><div><h2 className="font-bold">Conta</h2><p className="text-sm text-[#71837b]">Dados de acesso</p></div></div><FieldLabel label="E-mail"><input disabled className={`${field} disabled:bg-[#f2f6f4] disabled:text-[#71837b]`} value={values.email} /></FieldLabel><p className="mt-2 text-xs text-[#71837b]">O e-mail de acesso pode ser alterado com confirmação de segurança.</p></section><section className={`${card} p-5`}><h2 className="font-bold">Notificações</h2><div className="mt-4 space-y-3">{toggle("planUpdateNotifications", "Atualizações de planos", "Avisos ao publicar ou alterar treinos e dietas")}{toggle("checkinReminders", "Lembretes de check-in", "Alertas sobre check-ins enviados e pendentes")}</div><div className="mt-4 grid grid-cols-2 gap-3"><FieldLabel label="Silenciar a partir de"><input type="time" className={field} value={values.quietHoursStart} onChange={event => setValues(current => ({ ...current, quietHoursStart: event.target.value }))} /></FieldLabel><FieldLabel label="Retomar às"><input type="time" className={field} value={values.quietHoursEnd} onChange={event => setValues(current => ({ ...current, quietHoursEnd: event.target.value }))} /></FieldLabel></div></section></div>
        <div className="xl:col-span-2">{error && <p role="alert" className="mb-4 rounded-xl bg-[#fdebea] px-4 py-3 text-sm font-semibold text-[#a33c3c]">{error}</p>}<div className="flex justify-end"><Button disabled={saving}><Save size={16} /> {saving ? "Salvando..." : "Salvar configurações"}</Button></div></div>
      </form>}
      <AnimatePresence>{toast && <Toast message={toast} onDone={() => setToast("")} />}</AnimatePresence>
    </Shell>
  );
}

export function ProfessionalLibraryPage({ viewer }: { viewer: Viewer }) {
  const [tab, setTab] = useState<"exercises" | "foods">("exercises");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ exercises: Awaited<ReturnType<typeof getProfessionalLibrary>>["exercises"]; foods: Awaited<ReturnType<typeof getProfessionalLibrary>>["foods"] }>({ exercises: [], foods: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!viewer.professionalId) return;
    getProfessionalLibrary(viewer.professionalId).then(result => { setData({ exercises: result.exercises, foods: result.foods }); setError(result.error?.message ?? ""); setLoading(false); });
  }, [viewer.professionalId]);
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return (tab === "exercises" ? data.exercises : data.foods).filter(item => item.name.toLocaleLowerCase("pt-BR").includes(term));
  }, [data, search, tab]);
  return (
    <Shell profile="professional">
      <div className="flex flex-wrap items-end justify-between gap-4"><PageTitle kicker="BIBLIOTECA" title="Seu acervo profissional" text="Consulte exercícios usados nos treinos e alimentos disponíveis nos planos." /><div className="rounded-2xl bg-[#e7f4ec] px-4 py-3 text-sm font-bold text-[#087a50]">{data.exercises.length} exercícios · {data.foods.length} alimentos</div></div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"><div className="inline-flex w-fit rounded-xl bg-[#eaf2ed] p-1"><button onClick={() => setTab("exercises")} className={`rounded-lg px-4 py-2.5 text-sm font-bold ${tab === "exercises" ? "bg-white text-[#173f34] shadow-sm" : "text-[#61756d]"}`}>Exercícios</button><button onClick={() => setTab("foods")} className={`rounded-lg px-4 py-2.5 text-sm font-bold ${tab === "foods" ? "bg-white text-[#173f34] shadow-sm" : "text-[#61756d]"}`}>Alimentos</button></div><label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-[#dbe7e0] bg-white px-3"><Search size={18} className="text-[#91a39b]" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Buscar ${tab === "exercises" ? "exercício" : "alimento"}`} className="w-full py-3 text-sm outline-none" /></label></div>
      {loading ? <div className="mt-5 grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map(item => <div key={item} className="h-36 rounded-3xl bg-[#e9f1ed]" />)}</div> : error ? <div className="mt-5 rounded-2xl bg-[#fdebea] p-5 text-sm font-semibold text-[#a33c3c]">Não foi possível carregar a biblioteca: {error}</div> : items.length === 0 ? <section className={`${card} mt-5 grid min-h-64 place-items-center p-7 text-center`}><div><BookOpen className="mx-auto text-[#087a50]" /><h2 className="mt-3 text-lg font-bold">{search ? "Nenhum resultado encontrado" : `Nenhum ${tab === "exercises" ? "exercício" : "alimento"} disponível`}</h2><p className="mt-1 text-sm text-[#71837b]">{tab === "exercises" ? "Os exercícios aparecem aqui depois de serem usados em um treino." : "Os alimentos cadastrados para montagem das dietas aparecem aqui."}</p></div></section> : <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(item => tab === "exercises" ? <article key={item.id} className={`${card} p-5`}><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]"><Dumbbell size={20} /></span><div><h2 className="font-bold">{item.name}</h2><p className="mt-1 text-sm text-[#71837b]">{"muscle_group" in item && item.muscle_group ? item.muscle_group : "Grupo muscular não informado"}</p></div></div>{"video_url" in item && item.video_url && <a href={item.video_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#087a50]"><Video size={16} /> Ver demonstração</a>}</article> : <article key={item.id} className={`${card} p-5`}><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]"><Apple size={20} /></span><div><h2 className="font-bold">{item.name}</h2><p className="mt-1 text-sm text-[#71837b]">{"category" in item && item.category ? item.category : "Sem categoria"}</p></div></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#52665e]"><span className="rounded-lg bg-[#f0f6f3] px-2.5 py-1.5">{("calories" in item && item.calories) ?? 0} kcal</span><span className="rounded-lg bg-[#f0f6f3] px-2.5 py-1.5">P {("protein_g" in item && item.protein_g) ?? 0} g</span><span className="rounded-lg bg-[#f0f6f3] px-2.5 py-1.5">C {("carbohydrates_g" in item && item.carbohydrates_g) ?? 0} g</span></div></article>)}</div>}
    </Shell>
  );
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProfessionalFinancePage({ viewer }: { viewer: Viewer }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getFinanceData>> | null>(null);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof getProfessionalStudents>>>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "paid">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ studentId: "", amount: "249,90", dueDate: localDate(), autoSuspend: true, graceDays: 3 });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const professionalId = viewer.professionalId;
  const load = async () => {
    if (!professionalId) return;
    const [finance, linkedStudents] = await Promise.all([getFinanceData(professionalId), getProfessionalStudents(professionalId)]);
    setData(finance); setStudents(linkedStudents); setError(finance.error?.message ?? "");
    setForm(current => ({ ...current, studentId: current.studentId || linkedStudents[0]?.student_id || "" }));
  };
  useEffect(() => {
    if (!professionalId) return;
    let active = true;
    Promise.all([getFinanceData(professionalId), getProfessionalStudents(professionalId)]).then(([finance, linkedStudents]) => {
      if (!active) return;
      setData(finance); setStudents(linkedStudents); setError(finance.error?.message ?? "");
      setForm(current => ({ ...current, studentId: current.studentId || linkedStudents[0]?.student_id || "" }));
    });
    return () => { active = false; };
  }, [professionalId]);
  const rows = (data?.rows ?? []).filter(row => filter === "all" || row.status === filter);
  const filters = [["all", "Todas"], ["pending", "Pendentes"], ["overdue", "Atrasadas"], ["paid", "Pagas"]] as const;

  async function createCharge(event: FormEvent) {
    event.preventDefault(); if (!professionalId) return;
    const amount = Number(form.amount.replace(/\./g, "").replace(",", "."));
    if (!form.studentId || !form.dueDate || !Number.isFinite(amount) || amount <= 0) return setError("Preencha aluno, valor e vencimento corretamente.");
    setSaving(true); setError("");
    const result = await createFinanceCharge(professionalId, { ...form, amount });
    setSaving(false);
    if (result.error) return setError(result.error.message);
    setDialogOpen(false); setToast("Cobrança criada e salva no financeiro."); await load();
  }
  async function runAction(key: string, action: () => Promise<{ error: { message: string } | null }>, success: string) {
    setBusy(key); setError(""); const result = await action(); setBusy("");
    if (result.error) return setError(result.error.message);
    setToast(success); await load();
  }
  const metricCards = [
    { label: "PREVISTO NO MÊS", value: data?.metrics.expected ?? 0, detail: `${data?.rows.length ?? 0} lançamentos`, icon: CircleDollarSign, tone: "green" },
    { label: "RECEBIDO", value: data?.metrics.received ?? 0, detail: "Pagamentos confirmados", icon: CheckCircle2, tone: "green" },
    { label: "A VENCER", value: data?.metrics.pending ?? 0, detail: "Cobranças pendentes", icon: CalendarDays, tone: "yellow" },
    { label: "EM ATRASO", value: data?.metrics.overdue ?? 0, detail: `${data?.metrics.suspended ?? 0} acesso(s) suspenso(s)`, icon: AlertCircle, tone: "red" },
  ] as const;
  return <Shell profile="professional">
    <div className="flex flex-wrap items-end justify-between gap-4"><PageTitle kicker="FINANCEIRO" title="Mensalidades sem planilha." text="Controle vencimentos, pagamentos e acesso em um só lugar." /><Button onClick={() => { setError(""); setDialogOpen(true); }}><Plus size={17} /> Nova cobrança</Button></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map(item => { const Icon = item.icon; return <section key={item.label} className={`${card} p-5`}><div className="flex items-start justify-between"><div><p className="text-xs font-bold tracking-[.08em] text-[#71837b]">{item.label}</p><p className="mt-3 text-2xl font-bold">{currency.format(item.value)}</p></div><span className={`grid h-11 w-11 place-items-center rounded-2xl ${item.tone === "green" ? "bg-[#e7f4ec] text-[#087a50]" : item.tone === "yellow" ? "bg-[#fff1d2] text-[#a97000]" : "bg-[#fdebea] text-[#b94242]"}`}><Icon size={20} /></span></div><p className="mt-4 text-xs font-semibold text-[#61756d]">{item.detail}</p></section>; })}</div>
    <section className={`${card} mt-6 overflow-hidden`}><header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eee9] p-4"><div className="flex flex-wrap gap-2">{filters.map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${filter === value ? "bg-[#173f34] text-white" : "bg-[#f0f6f3] text-[#61756d] hover:bg-[#e6f0ea]"}`}>{label}</button>)}</div><p className="text-xs text-[#71837b]">Suspensão automática respeita a carência de cada aluno.</p></header>
      {data === null ? <div className="animate-pulse p-6"><div className="h-16 rounded-2xl bg-[#e9f1ed]" /><div className="mt-3 h-16 rounded-2xl bg-[#e9f1ed]" /></div> : error && data.rows.length === 0 ? <p className="p-6 text-sm font-semibold text-[#a33c3c]">Não foi possível carregar o financeiro: {error}</p> : rows.length === 0 ? <div className="grid min-h-52 place-items-center p-6 text-center"><div><CircleDollarSign className="mx-auto text-[#087a50]" /><h2 className="mt-3 font-bold">Nenhuma cobrança nesta categoria</h2><p className="mt-1 text-sm text-[#71837b]">Crie uma cobrança para um aluno vinculado.</p></div></div> : <div className="divide-y divide-[#e7eee9]">{rows.map(row => <FinanceRowCard key={row.paymentId} row={row} busy={busy} onPaid={() => runAction(`paid-${row.paymentId}`, () => markFinancePaymentPaid(row.paymentId), "Pagamento confirmado e acesso atualizado.")} onAccess={() => runAction(`access-${row.studentId}`, () => setStudentAccess(row.studentId, row.accessStatus === "suspended" ? "active" : "suspended", "Mensalidade pendente"), row.accessStatus === "suspended" ? "Acesso do aluno liberado." : "Acesso do aluno suspenso.")} onReminder={() => professionalId && runAction(`reminder-${row.paymentId}`, () => sendPaymentReminder(professionalId, row), "Lembrete enviado ao aluno.")} />)}</div>}
    </section>
    {error && data?.rows.length ? <p role="alert" className="mt-4 rounded-xl bg-[#fdebea] px-4 py-3 text-sm font-semibold text-[#a33c3c]">{error}</p> : null}
    <AnimatePresence>{dialogOpen && <Dialog title="Nova cobrança" description="O lançamento fica salvo no perfil financeiro do aluno." onClose={() => setDialogOpen(false)}><form onSubmit={createCharge} className="space-y-4"><FieldLabel label="Aluno"><select required className={field} value={form.studentId} onChange={event => setForm(current => ({ ...current, studentId: event.target.value }))}><option value="">Selecione</option>{students.map(item => { const profile = item.profiles as { full_name?: string } | null; return <option key={item.student_id} value={item.student_id}>{profile?.full_name ?? "Aluno"}</option>; })}</select></FieldLabel><div className="grid gap-4 sm:grid-cols-2"><FieldLabel label="Valor"><input required inputMode="decimal" className={field} value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} /></FieldLabel><FieldLabel label="Vencimento"><input required type="date" className={field} value={form.dueDate} onChange={event => setForm(current => ({ ...current, dueDate: event.target.value }))} /></FieldLabel></div><FieldLabel label="Dias de carência"><input type="number" min="0" max="30" className={field} value={form.graceDays} onChange={event => setForm(current => ({ ...current, graceDays: Number(event.target.value) }))} /></FieldLabel><button type="button" role="switch" aria-checked={form.autoSuspend} onClick={() => setForm(current => ({ ...current, autoSuspend: !current.autoSuspend }))} className="flex w-full items-center justify-between rounded-2xl border border-[#dbe7e0] bg-white p-4 text-left"><span><b className="block text-sm">Suspender automaticamente</b><span className="mt-1 block text-xs text-[#71837b]">Após o vencimento e o período de carência</span></span><span className={`relative h-7 w-12 rounded-full transition ${form.autoSuspend ? "bg-[#087a50]" : "bg-[#cbd8d1]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.autoSuspend ? "translate-x-6" : "translate-x-1"}`} /></span></button>{error && <p className="rounded-xl bg-[#fdebea] p-3 text-sm font-semibold text-[#a33c3c]">{error}</p>}<Button disabled={saving || students.length === 0} className="w-full">{saving ? "Salvando..." : "Criar cobrança"}</Button></form></Dialog>}{toast && <Toast message={toast} onDone={() => setToast("")} />}</AnimatePresence>
  </Shell>;
}

function FinanceRowCard({ row, busy, onPaid, onAccess, onReminder }: { row: FinanceRow; busy: string; onPaid: () => void; onAccess: () => void; onReminder: () => void }) {
  const date = new Date(`${row.dueDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const status = row.status === "paid" ? ["Pago", "bg-[#e7f4ec] text-[#087a50]"] : row.status === "overdue" ? ["Atrasado", "bg-[#fdebea] text-[#b94242]"] : row.status === "waived" ? ["Isento", "bg-[#eef2f0] text-[#61756d]"] : ["Pendente", "bg-[#fff1d2] text-[#a97000]"];
  return <article className="grid gap-4 p-4 lg:grid-cols-[1.4fr_.65fr_.65fr_1fr] lg:items-center"><div className="flex items-center gap-3"><Avatar name={row.studentName} /><div><p className="text-sm font-bold">{row.studentName}</p><p className="mt-0.5 text-xs text-[#71837b]">{currency.format(row.amount)} · {row.autoSuspend ? `carência ${row.graceDays} dia(s)` : "sem bloqueio automático"}</p></div></div><div><p className="text-sm font-bold">{date}</p><p className="text-xs text-[#71837b]">vencimento</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status[1]}`}>{status[0]}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.accessStatus === "suspended" ? "bg-[#fdebea] text-[#b94242]" : "bg-[#e7f4ec] text-[#087a50]"}`}>{row.accessStatus === "suspended" ? "Suspenso" : "Em dia"}</span></div><div className="flex flex-wrap justify-start gap-2 lg:justify-end">{row.status !== "paid" && row.status !== "waived" && <Button kind="soft" className="px-3 py-2 text-xs" disabled={busy === `paid-${row.paymentId}`} onClick={onPaid}><CheckCircle2 size={15} /> Confirmar</Button>}{row.status !== "paid" && <Button kind="outline" className="px-3 py-2 text-xs" disabled={busy === `reminder-${row.paymentId}`} onClick={onReminder}><Bell size={15} /> Lembrar</Button>}<Button kind="outline" className="px-3 py-2 text-xs" disabled={busy === `access-${row.studentId}`} onClick={onAccess}><ShieldCheck size={15} /> {row.accessStatus === "suspended" ? "Liberar" : "Suspender"}</Button></div></article>;
}
