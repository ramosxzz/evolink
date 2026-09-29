"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AtSign, BadgeCheck, CalendarClock, Check, MapPin, MessageSquareQuote, Monitor, Send, Star, Users } from "lucide-react";
import { Button, Shell } from "@/components/app-shell";
import { BeforeAfter } from "@/components/portfolio/before-after";
import { StarInput, Stars } from "@/components/portfolio/stars";
import { FramedAvatar } from "@/components/social/framed-avatar";
import { Modal } from "@/components/ui/modal";
import { Reveal } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { Viewer } from "@/lib/evolink-data";
import { cancelLead, deleteTestimonial, getCoachPage, modalityLabels, priceLabel, sendLead, writeTestimonial } from "@/lib/portfolio-data";

type PageData = NonNullable<Awaited<ReturnType<typeof getCoachPage>>>;
const field = "mt-2 w-full rounded-xl border border-[#dbe7e0] bg-white px-4 py-3 text-sm font-normal outline-none transition placeholder:text-[#9aaba3] focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";
const goals = ["Hipertrofia", "Emagrecimento", "Campeonato", "Condicionamento", "Saúde", "Outro"];

export function CoachPage({ viewer, coachId }: { viewer: Viewer; coachId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PageData | null | undefined>(undefined);
  const [leadOpen, setLeadOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getCoachPage(coachId, viewer.id).then(result => { if (active) setData(result); });
    return () => { active = false; };
  }, [coachId, viewer.id]);

  if (data === undefined) return (
    <Shell profile={viewer.role}>
      <Skeleton className="h-64 rounded-3xl" />
      <div className="mt-4 grid gap-4 md:grid-cols-3">{[0, 1, 2].map(key => <Skeleton key={key} className="aspect-[4/5] rounded-3xl" />)}</div>
    </Shell>
  );
  if (data === null) return (
    <Shell profile={viewer.role}>
      <section className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-8 text-center shadow-[var(--card-shadow)]">
        <h1 className="text-lg font-bold">Portfólio indisponível</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Este treinador ainda não publicou o portfólio.</p>
        <Button className="mt-5" kind="soft" onClick={() => router.push("/treinadores")}>Ver outros treinadores</Button>
      </section>
    </Shell>
  );

  const { coach } = data;
  const own = coach.id === viewer.id;
  const canRequest = viewer.role === "student" && !data.isStudent && coach.accepting;
  const canReview = viewer.role === "student" && data.wasStudent && !data.ownTestimonial;
  const place = [coach.city, coach.state].filter(Boolean).join(" · ");

  return (
    <Shell profile={viewer.role}>
      <button onClick={() => router.back()} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"><ArrowLeft size={16} /> Voltar</button>

      <Reveal>
        <section className="overflow-hidden rounded-3xl bg-white shadow-[var(--card-shadow)]">
          <div className="h-24 bg-[radial-gradient(120%_140%_at_0%_0%,#0b5a3f_0%,#07352b_55%,#062a22_100%)] md:h-28" />
          <div className="-mt-12 px-5 pb-6 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="rounded-full bg-white p-1"><FramedAvatar author={coach.author} size="xl" /></div>
              <div className="flex flex-wrap gap-2 pb-1">
                {own && <Button kind="outline" onClick={() => router.push("/profissional/portfolio")}>Editar portfólio</Button>}
                {canRequest && (data.openLead
                  ? <Button kind="soft" onClick={async () => { await cancelLead(data.openLead!); setData({ ...data, openLead: null }); }}><span className="inline-flex items-center gap-1.5"><Check size={16} /> Pedido enviado · cancelar</span></Button>
                  : <Button onClick={() => setLeadOpen(true)}><span className="inline-flex items-center gap-1.5"><Send size={16} /> Quero ser acompanhado</span></Button>)}
                {viewer.role === "student" && !data.isStudent && !coach.accepting && <span className="rounded-full bg-[#f1f4f2] px-4 py-2 text-sm font-semibold text-[var(--muted)]">Sem vagas no momento</span>}
                {data.isStudent && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f4ec] px-4 py-2 text-sm font-semibold text-[#087a50]"><BadgeCheck size={16} /> Seu treinador</span>}
              </div>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{coach.author.name}</h1>
            {coach.headline && <p className="mt-1 max-w-2xl text-[15px] text-[var(--muted)]">{coach.headline}</p>}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#35483f]">
              {coach.rating !== null && <span className="inline-flex items-center gap-1.5"><Star size={15} className="fill-[#f2b705] text-[#f2b705]" /><strong className="tabular">{coach.rating.toLocaleString("pt-BR")}</strong><span className="text-[var(--muted)]">({coach.reviews})</span></span>}
              <span className="inline-flex items-center gap-1.5"><Monitor size={15} className="text-[var(--emerald)]" />{modalityLabels[coach.modality]}</span>
              {place && <span className="inline-flex items-center gap-1.5"><MapPin size={15} className="text-[var(--emerald)]" />{place}</span>}
              {coach.yearsExperience !== null && <span className="inline-flex items-center gap-1.5"><CalendarClock size={15} className="text-[var(--emerald)]" />{coach.yearsExperience} {coach.yearsExperience === 1 ? "ano" : "anos"} de experiência</span>}
              {coach.students > 0 && <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-[var(--emerald)]" />{coach.students} {coach.students === 1 ? "aluno" : "alunos"} no Evolink</span>}
              {coach.instagram && <a href={`https://instagram.com/${coach.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[var(--emerald)] hover:underline"><AtSign size={15} />{coach.instagram}</a>}
            </div>
            {priceLabel(coach.priceFromCents) && <p className="mt-4 inline-flex rounded-2xl bg-[var(--surface)] px-4 py-2 text-sm font-bold">{priceLabel(coach.priceFromCents)}</p>}
            {coach.specialties.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {coach.specialties.map(item => <span key={item} className="rounded-full bg-[#e7f4ec] px-3 py-1 text-xs font-semibold text-[#087a50]">{item}</span>)}
              </div>
            )}
            {coach.about && <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-[#35483f]">{coach.about}</p>}
          </div>
        </section>
      </Reveal>

      {data.transformations.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Resultados de alunos</h2>
          <p className="text-sm text-[var(--muted)]">Arraste para comparar antes e depois.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.transformations.map((item, index) => (
              <Reveal key={item.id} index={index}>
                <article className="overflow-hidden rounded-3xl bg-white shadow-[var(--card-shadow)]">
                  <div className="p-2"><BeforeAfter before={item.beforeUrl} after={item.afterUrl} alt={item.title} /></div>
                  <div className="px-4 pb-4 pt-1">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-[var(--muted)]">{[item.durationWeeks && `${item.durationWeeks} semanas`, item.description].filter(Boolean).join(" · ")}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Depoimentos</h2>
          {canReview && <Button kind="soft" onClick={() => setReviewOpen(true)}><span className="inline-flex items-center gap-1.5"><MessageSquareQuote size={16} /> Avaliar treinador</span></Button>}
        </div>
        {data.ownTestimonial && data.ownTestimonial.status !== "published" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-[#fff6dc] px-4 py-3 text-sm text-[#6d4c00]">
            <span className="flex-1">{data.ownTestimonial.status === "pending" ? "Seu depoimento foi enviado e aguarda a aprovação do treinador." : "Seu depoimento não está visível no portfólio."}</span>
            <button className="text-xs font-bold underline" onClick={async () => { await deleteTestimonial(data.ownTestimonial!.id); setData({ ...data, ownTestimonial: null }); }}>Apagar</button>
          </div>
        )}
        {data.testimonials.length === 0 ? (
          <p className="mt-3 rounded-3xl border border-dashed border-[#cfe3d8] bg-white px-6 py-8 text-center text-sm text-[var(--muted)]">Ainda não há depoimentos publicados.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.testimonials.map((item, index) => (
              <Reveal key={item.id} index={index}>
                <figure className="h-full rounded-3xl bg-white p-5 shadow-[var(--card-shadow)]">
                  <Stars value={item.rating} />
                  <blockquote className="mt-2 text-sm leading-relaxed text-[#35483f]">“{item.body}”</blockquote>
                  <figcaption className="mt-3 text-xs font-semibold text-[var(--muted)]">{item.authorName} · aluno no Evolink</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <LeadModal open={leadOpen} onClose={() => setLeadOpen(false)} coachName={coach.author.name} onSend={async (goal, message) => {
        const { id, error } = await sendLead(coach.id, viewer.id, goal, message);
        if (error || !id) return "Não foi possível enviar. Talvez você já tenha um pedido aberto.";
        setData({ ...data, openLead: id }); setLeadOpen(false); return null;
      }} />
      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} onSend={async (rating, body) => {
        const { data: testimonial, error } = await writeTestimonial(coach.id, viewer.id, rating, body);
        if (error || !testimonial) return "Não foi possível enviar o depoimento.";
        setData({ ...data, ownTestimonial: testimonial }); setReviewOpen(false); return null;
      }} />
    </Shell>
  );
}

function LeadModal({ open, onClose, coachName, onSend }: { open: boolean; onClose: () => void; coachName: string; onSend: (goal: string, message: string) => Promise<string | null> }) {
  const [goal, setGoal] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!goal) return setError("Escolha seu objetivo.");
    setSending(true); setError("");
    const result = await onSend(goal, message);
    setSending(false);
    if (result) setError(result); else { setGoal(""); setMessage(""); }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Pedir acompanhamento`} description={`${coachName.split(" ")[0]} recebe seu pedido e, se tiver vaga, envia um convite para você.`}
      footer={<><Button kind="outline" onClick={onClose}>Cancelar</Button><Button loading={sending} disabled={sending} onClick={submit}>{sending ? "Enviando" : "Enviar pedido"}</Button></>}>
      <p className="text-sm font-semibold">Seu objetivo</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {goals.map(item => (
          <button key={item} type="button" onClick={() => setGoal(item)} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95 ${goal === item ? "border-[var(--emerald)] bg-[#e7f4ec] text-[#087a50]" : "border-[#dbe7e0] text-[var(--muted)]"}`}>{item}</button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-semibold">Mensagem (opcional)
        <textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={600} rows={4} placeholder="Conte um pouco da sua rotina, experiência de treino e o que busca." className={`${field} resize-y`} />
      </label>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-[#a12c2c]">{error}</p>}
    </Modal>
  );
}

function ReviewModal({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (rating: number, body: string) => Promise<string | null> }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (body.trim().length < 10) return setError("Escreva pelo menos uma frase sobre o acompanhamento.");
    setSending(true); setError("");
    const result = await onSend(rating, body);
    setSending(false);
    if (result) setError(result); else setBody("");
  }
  return (
    <Modal open={open} onClose={onClose} title="Avaliar treinador" description="Seu depoimento aparece com seu primeiro nome depois que o treinador aprovar."
      footer={<><Button kind="outline" onClick={onClose}>Cancelar</Button><Button loading={sending} disabled={sending} onClick={submit}>{sending ? "Enviando" : "Enviar depoimento"}</Button></>}>
      <StarInput value={rating} onChange={setRating} />
      <label className="mt-4 block text-sm font-semibold">Como foi o acompanhamento?
        <textarea value={body} onChange={event => setBody(event.target.value)} maxLength={600} rows={5} placeholder="Resultados, atenção do treinador, o que mudou para você..." className={`${field} resize-y`} />
      </label>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-[#a12c2c]">{error}</p>}
    </Modal>
  );
}
