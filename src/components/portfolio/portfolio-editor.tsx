"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, Eye, EyeOff, ImagePlus, Inbox, MessageSquareQuote, Plus, Sparkles, Trash2, UserCheck, X } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { BeforeAfter } from "@/components/portfolio/before-after";
import { Stars } from "@/components/portfolio/stars";
import { ActionMenu } from "@/components/ui/action-menu";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";
import type { Viewer } from "@/lib/evolink-data";
import { brazilianStates } from "@/lib/events-data";
import {
  addTransformation, emptyPortfolio, getOwnPortfolio, modalityLabels, removeTransformation, respondToLead, savePortfolio,
  setTestimonialStatus, specialtyOptions, type Lead, type Modality, type Portfolio, type Testimonial, type Transformation,
} from "@/lib/portfolio-data";

const field = "mt-2 w-full rounded-xl border border-[#dbe7e0] bg-white px-4 py-3 text-sm font-normal outline-none transition placeholder:text-[#9aaba3] focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";
const label = "block text-sm font-semibold text-[var(--ink)]";
const card = "rounded-3xl bg-white p-5 shadow-[var(--card-shadow)] md:p-6";
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

type Tab = "perfil" | "transformacoes" | "depoimentos" | "interessados";
type Data = Awaited<ReturnType<typeof getOwnPortfolio>>;

export function PortfolioEditor({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const coachId = viewer.professionalId ?? viewer.id;
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("perfil");

  useEffect(() => {
    let active = true;
    getOwnPortfolio(coachId).then(result => { if (active) setData(result); });
    return () => { active = false; };
  }, [coachId]);

  const pendingTestimonials = data?.testimonials.filter(item => item.status === "pending").length ?? 0;
  const newLeads = data?.leads.filter(item => item.status === "new").length ?? 0;
  const tabs: [Tab, string][] = [
    ["perfil", "Perfil"],
    ["transformacoes", `Transformações${data?.transformations.length ? ` · ${data.transformations.length}` : ""}`],
    ["depoimentos", `Depoimentos${pendingTestimonials ? ` · ${pendingTestimonials} novo${pendingTestimonials > 1 ? "s" : ""}` : ""}`],
    ["interessados", `Interessados${newLeads ? ` · ${newLeads}` : ""}`],
  ];

  return (
    <Shell profile="professional">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle title="Portfólio" text="Sua vitrine para novos alunos: resultados, depoimentos e como você trabalha." />
        {data?.portfolio && (
          <Button kind="outline" onClick={() => router.push(`/treinadores/${coachId}`)}>
            <span className="inline-flex items-center gap-2"><Eye size={16} /> Ver como aluno</span>
          </Button>
        )}
      </div>

      <div className="mt-6 flex w-full gap-1 overflow-x-auto rounded-xl bg-[#e9f0ec] p-1 sm:w-fit">
        {tabs.map(([value, text]) => (
          <button key={value} onClick={() => setTab(value)} className={`relative shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${tab === value ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
            {tab === value && <motion.span layoutId="portfolio-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" />}
            <span className="relative whitespace-nowrap">{text}</span>
          </button>
        ))}
      </div>

      {data === null ? (
        <div className="mt-5 space-y-4"><Skeleton className="h-28 rounded-3xl" /><ListSkeleton rows={3} /></div>
      ) : (
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-5">
          {tab === "perfil" && <ProfileTab coachId={coachId} initial={data.portfolio} onSaved={portfolio => setData(current => current && { ...current, portfolio })} />}
          {tab === "transformacoes" && <TransformationsTab coachId={coachId} items={data.transformations} onChange={transformations => setData(current => current && { ...current, transformations })} />}
          {tab === "depoimentos" && <TestimonialsTab items={data.testimonials} onChange={testimonials => setData(current => current && { ...current, testimonials })} />}
          {tab === "interessados" && <LeadsTab items={data.leads} onChange={leads => setData(current => current && { ...current, leads })} />}
        </motion.div>
      )}
    </Shell>
  );
}

function Toggle({ checked, onChange, title, text }: { checked: boolean; onChange: (value: boolean) => void; title: string; text: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-4 rounded-2xl bg-[var(--surface)] px-4 py-3.5 text-left transition hover:bg-[#eef4f1]">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-[var(--muted)]">{text}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-[var(--emerald)]" : "bg-[#cfdcd5]"}`}>
        <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 35 }} className={`absolute top-1 size-5 rounded-full bg-white shadow ${checked ? "right-1" : "left-1"}`} />
      </span>
    </button>
  );
}

function ProfileTab({ coachId, initial, onSaved }: { coachId: string; initial: Portfolio | null; onSaved: (value: Portfolio) => void }) {
  const [value, setValue] = useState<Portfolio>(initial ?? emptyPortfolio);
  const [price, setPrice] = useState(initial?.priceFromCents ? String(initial.priceFromCents / 100) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const set = <K extends keyof Portfolio>(key: K, next: Portfolio[K]) => setValue(current => ({ ...current, [key]: next }));

  function toggleSpecialty(item: string) {
    setValue(current => ({
      ...current,
      specialties: current.specialties.includes(item) ? current.specialties.filter(entry => entry !== item) : current.specialties.length >= 8 ? current.specialties : [...current.specialties, item],
    }));
  }

  async function save() {
    const priceNumber = price.trim() ? Number(price.replace(/\./g, "").replace(",", ".")) : null;
    if (priceNumber !== null && (!Number.isFinite(priceNumber) || priceNumber < 10)) return setMessage({ kind: "error", text: "Informe um preço mensal válido (mínimo R$ 10) ou deixe em branco." });
    if (value.published && (!value.headline.trim() || !value.specialties.length)) return setMessage({ kind: "error", text: "Para publicar, preencha o título e escolha ao menos uma especialidade." });
    if (value.instagram && !/^@?[A-Za-z0-9._]{1,30}$/.test(value.instagram.trim())) return setMessage({ kind: "error", text: "Instagram inválido. Use só o nome de usuário." });
    const next = { ...value, priceFromCents: priceNumber === null ? null : Math.round(priceNumber * 100) };
    setSaving(true); setMessage(null);
    const { error } = await savePortfolio(coachId, next);
    setSaving(false);
    if (error) return setMessage({ kind: "error", text: "Não foi possível salvar. Confira os campos." });
    onSaved(next);
    setMessage({ kind: "ok", text: next.published ? "Portfólio salvo e publicado." : "Portfólio salvo. Ele ainda não aparece para alunos." });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className={card}>
        <label className={label}>Título
          <input value={value.headline} onChange={event => set("headline", event.target.value)} maxLength={120} placeholder="Ex.: Treinador de fisiculturismo natural e hipertrofia" className={field} />
        </label>
        <label className={`${label} mt-4`}>Sobre você
          <textarea value={value.about} onChange={event => set("about", event.target.value)} maxLength={2000} rows={5} placeholder="Sua formação, como é o acompanhamento, o que o aluno recebe..." className={`${field} resize-y`} />
        </label>
        <p className={`${label} mt-5`}>Especialidades <span className="font-normal text-[var(--muted)]">(até 8)</span></p>
        <div className="mt-2 flex flex-wrap gap-2">
          {specialtyOptions.map(item => {
            const on = value.specialties.includes(item);
            return (
              <button key={item} type="button" onClick={() => toggleSpecialty(item)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95 ${on ? "border-[var(--emerald)] bg-[#e7f4ec] text-[#087a50]" : "border-[#dbe7e0] bg-white text-[var(--muted)] hover:border-[#b9d6c6]"}`}>
                {on && <Check size={14} />}{item}
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className={label}>Atendimento</p>
            <Select className="mt-2" value={value.modality} onChange={next => set("modality", next as Modality)} options={Object.entries(modalityLabels).map(([key, text]) => ({ value: key, label: text }))} />
          </div>
          <label className={label}>Preço a partir de (R$/mês)
            <input value={price} onChange={event => setPrice(event.target.value.replace(/[^\d,.]/g, ""))} inputMode="decimal" placeholder="Ex.: 250" className={field} />
          </label>
          <label className={label}>Cidade
            <input value={value.city} onChange={event => set("city", event.target.value)} maxLength={80} placeholder="Porto Alegre" className={field} />
          </label>
          <div>
            <p className={label}>Estado</p>
            <Select className="mt-2" value={value.state} onChange={next => set("state", next)} placeholder="Selecione" options={[{ value: "", label: "Não informar" }, ...brazilianStates.map(uf => ({ value: uf, label: uf }))]} />
          </div>
          <label className={label}>Anos de experiência
            <input value={value.yearsExperience ?? ""} onChange={event => set("yearsExperience", event.target.value ? Math.min(60, Number(event.target.value.replace(/\D/g, ""))) : null)} inputMode="numeric" placeholder="Ex.: 6" className={field} />
          </label>
          <label className={label}>Instagram
            <input value={value.instagram} onChange={event => set("instagram", event.target.value)} maxLength={31} placeholder="@seuperfil" className={field} />
          </label>
        </div>
      </section>

      <aside className="space-y-4">
        <section className={`${card} space-y-3`}>
          <Toggle checked={value.published} onChange={next => set("published", next)} title="Portfólio público" text="Aparece na busca de treinadores." />
          <Toggle checked={value.accepting} onChange={next => set("accepting", next)} title="Aceitando novos alunos" text="Mostra o botão de pedir acompanhamento." />
          {message && <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm font-medium ${message.kind === "error" ? "bg-[#fdecec] text-[#a12c2c]" : "bg-[#e7f4ec] text-[#087a50]"}`}>{message.text}</p>}
          <Button className="w-full" loading={saving} disabled={saving} onClick={save}>{saving ? "Salvando" : "Salvar portfólio"}</Button>
        </section>
        <section className="rounded-3xl border border-dashed border-[#cfe3d8] p-5 text-sm text-[var(--muted)]">
          <p className="flex items-center gap-2 font-semibold text-[var(--ink)]"><Sparkles size={16} className="text-[var(--emerald)]" /> Dica</p>
          <p className="mt-1.5">Portfólios com transformações e depoimentos recebem muito mais pedidos. Peça para seus alunos avaliarem você pela sua página.</p>
        </section>
      </aside>
    </div>
  );
}

function PhotoPicker({ title, file, onPick }: { title: string; file: File | null; onPick: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Object URLs must be created after the file exists and revoked on change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <button type="button" onClick={() => inputRef.current?.click()} className="relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-[#cfe3d8] bg-[var(--surface)] text-[var(--muted)] transition hover:border-[#9cc7b1]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {file && preview ? <img src={preview} alt={title} className="absolute inset-0 size-full object-cover" /> : (
        <span className="flex flex-col items-center gap-1.5 text-sm font-medium"><ImagePlus size={22} />{title}</span>
      )}
      {file && <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white">{title}</span>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { onPick(event.target.files?.[0] ?? null); event.target.value = ""; }} />
    </button>
  );
}

function TransformationsTab({ coachId, items, onChange }: { coachId: string; items: Transformation[]; onChange: (items: Transformation[]) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", weeks: "", description: "", consent: false });
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() { setForm({ title: "", weeks: "", description: "", consent: false }); setBefore(null); setAfter(null); setError(""); }

  async function save() {
    if (form.title.trim().length < 3) return setError("Dê um título ao resultado, por exemplo: -12 kg em 16 semanas.");
    if (!before || !after) return setError("Escolha a foto de antes e a de depois.");
    if (!form.consent) return setError("Confirme que o aluno autorizou a publicação.");
    setSaving(true); setError("");
    const { data, error: saveError } = await addTransformation(coachId, { title: form.title, description: form.description, durationWeeks: form.weeks ? Math.min(260, Number(form.weeks)) : null, before, after });
    setSaving(false);
    if (saveError || !data) return setError(saveError?.message.startsWith("Formato") ? saveError.message : "Não foi possível salvar as fotos. Tente novamente.");
    onChange([data, ...items]); setOpen(false); reset();
  }

  async function remove(item: Transformation) {
    if (!window.confirm(`Remover "${item.title}" do portfólio?`)) return;
    const { error: removeError } = await removeTransformation(item);
    if (!removeError) onChange(items.filter(entry => entry.id !== item.id));
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button onClick={() => setOpen(true)} className="grid min-h-64 place-items-center rounded-3xl border-2 border-dashed border-[#cfe3d8] bg-white p-6 text-center transition hover:border-[#9cc7b1] hover:bg-[#fbfdfc] active:scale-[0.99]">
          <span className="flex flex-col items-center gap-2">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#e7f4ec] text-[var(--emerald)]"><Plus size={22} /></span>
            <span className="font-semibold">Adicionar transformação</span>
            <span className="max-w-[220px] text-xs text-[var(--muted)]">Foto de antes e depois de um aluno, com a autorização dele.</span>
          </span>
        </button>
        {items.map(item => (
          <article key={item.id} className="overflow-hidden rounded-3xl bg-white shadow-[var(--card-shadow)]">
            <div className="p-2"><BeforeAfter before={item.beforeUrl} after={item.afterUrl} alt={item.title} /></div>
            <div className="flex items-start gap-2 px-4 pb-4 pt-1">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{item.title}</span>
                {item.durationWeeks && <span className="block text-xs text-[var(--muted)]">{item.durationWeeks} semanas</span>}
              </span>
              <ActionMenu actions={[{ label: "Remover", icon: Trash2, danger: true, onSelect: () => remove(item) }]} />
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => { setOpen(false); reset(); }}
        title="Nova transformação"
        description="As fotos ficam públicas no seu portfólio."
        footer={<><Button kind="outline" onClick={() => { setOpen(false); reset(); }}>Cancelar</Button><Button loading={saving} disabled={saving} onClick={save}>{saving ? "Enviando" : "Publicar"}</Button></>}
      >
        <div className="grid grid-cols-2 gap-3">
          <PhotoPicker title="Antes" file={before} onPick={setBefore} />
          <PhotoPicker title="Depois" file={after} onPick={setAfter} />
        </div>
        <label className={`${label} mt-4`}>Resultado
          <input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} maxLength={80} placeholder="Ex.: -12 kg e 8% de gordura" className={field} />
        </label>
        <div className="mt-4 grid grid-cols-[120px_1fr] gap-3">
          <label className={label}>Semanas
            <input value={form.weeks} onChange={event => setForm(current => ({ ...current, weeks: event.target.value.replace(/\D/g, "").slice(0, 3) }))} inputMode="numeric" placeholder="16" className={field} />
          </label>
          <label className={label}>Detalhes (opcional)
            <input value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} maxLength={400} placeholder="Preparação para o estadual" className={field} />
          </label>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-[var(--surface)] p-4 text-sm">
          <input type="checkbox" checked={form.consent} onChange={event => setForm(current => ({ ...current, consent: event.target.checked }))} className="mt-0.5 size-4 accent-[#087a50]" />
          <span>Confirmo que o aluno <strong>autorizou</strong> a publicação destas fotos no meu portfólio.</span>
        </label>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-[#a12c2c]">{error}</p>}
      </Modal>
    </>
  );
}

const testimonialStatus = {
  pending: { text: "Aguardando aprovação", tone: "bg-[#fff6dc] text-[#8a6100]" },
  published: { text: "Publicado", tone: "bg-[#e7f4ec] text-[#087a50]" },
  hidden: { text: "Oculto", tone: "bg-[#f1f4f2] text-[#5f7169]" },
};

function TestimonialsTab({ items, onChange }: { items: Testimonial[]; onChange: (items: Testimonial[]) => void }) {
  const [busy, setBusy] = useState("");
  async function update(item: Testimonial, status: "published" | "hidden") {
    setBusy(item.id);
    const { error } = await setTestimonialStatus(item.id, status);
    setBusy("");
    if (!error) onChange(items.map(entry => entry.id === item.id ? { ...entry, status } : entry));
  }
  if (!items.length) return (
    <section className="rounded-3xl border border-dashed border-[#cfe3d8] bg-white px-6 py-12 text-center">
      <MessageSquareQuote className="mx-auto text-[#9cc7b1]" />
      <h2 className="mt-3 font-bold">Nenhum depoimento ainda</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">Seus alunos podem avaliar você pela sua página de treinador. Você aprova antes de aparecer.</p>
    </section>
  );
  return (
    <ul className="space-y-3">
      {items.map(item => (
        <li key={item.id} className={card}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{item.authorName}</span>
            <Stars value={item.rating} />
            <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${testimonialStatus[item.status].tone}`}>{testimonialStatus[item.status].text}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#35483f]">“{item.body}”</p>
          <div className="mt-3 flex gap-2">
            {item.status !== "published" && <Button kind="soft" loading={busy === item.id} disabled={Boolean(busy)} onClick={() => update(item, "published")}><span className="inline-flex items-center gap-1.5"><Eye size={15} /> Publicar</span></Button>}
            {item.status !== "hidden" && <Button kind="ghost" disabled={Boolean(busy)} onClick={() => update(item, "hidden")}><span className="inline-flex items-center gap-1.5"><EyeOff size={15} /> Ocultar</span></Button>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function LeadsTab({ items, onChange }: { items: Lead[]; onChange: (items: Lead[]) => void }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function respond(item: Lead, accept: boolean) {
    setBusy(`${item.id}:${accept}`); setError("");
    const { error: respondError } = await respondToLead(item.id, accept);
    setBusy("");
    if (respondError) return setError(respondError.message);
    onChange(items.map(entry => entry.id === item.id ? { ...entry, status: accept ? "invited" : "declined" } : entry));
  }
  if (!items.length) return (
    <section className="rounded-3xl border border-dashed border-[#cfe3d8] bg-white px-6 py-12 text-center">
      <Inbox className="mx-auto text-[#9cc7b1]" />
      <h2 className="mt-3 font-bold">Nenhum interessado ainda</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">Quando alguém pedir acompanhamento pela busca de treinadores, o pedido aparece aqui.</p>
    </section>
  );
  return (
    <>
      {error && <p role="alert" className="mb-3 rounded-2xl bg-[#fdecec] px-4 py-3 text-sm font-medium text-[#a12c2c]">{error}</p>}
      <ul className="space-y-3">
        {items.map(item => (
          <li key={item.id} className={card}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{item.requesterName}</span>
              <span className="rounded-full bg-[#e7f4ec] px-2.5 py-1 text-xs font-bold text-[#087a50]">{item.goal}</span>
              <span className="ml-auto text-xs text-[var(--muted)]">{shortDate(item.createdAt)}</span>
            </div>
            {item.message && <p className="mt-2 text-sm leading-relaxed text-[#35483f]">{item.message}</p>}
            {item.status === "new" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button loading={busy === `${item.id}:true`} disabled={Boolean(busy)} onClick={() => respond(item, true)}><span className="inline-flex items-center gap-1.5"><UserCheck size={15} /> Aceitar e convidar</span></Button>
                <Button kind="ghost" loading={busy === `${item.id}:false`} disabled={Boolean(busy)} onClick={() => respond(item, false)}><span className="inline-flex items-center gap-1.5"><X size={15} /> Sem vagas</span></Button>
              </div>
            ) : (
              <p className="mt-3 text-xs font-semibold text-[var(--muted)]">{item.status === "invited" ? "Convite enviado. Quando aceitar, aparece em Alunos." : "Você respondeu que está sem vagas."}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
