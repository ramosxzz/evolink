"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, BedDouble, CalendarDays, Car, CheckCircle2, ExternalLink, Info, Map, MapPin, Megaphone, MessageSquareQuote, Pencil, Share2, ShieldCheck, Star, Trash2, Trophy, Users, XCircle,
} from "lucide-react";
import { Button, Shell } from "@/components/app-shell";
import { FramedAvatar } from "@/components/social/framed-avatar";
import { timeAgo } from "@/components/social/post-card";
import { ProgressBar } from "@/components/ui/motion";
import { localDate } from "@/lib/dates";
import type { Viewer } from "@/lib/evolink-data";
import {
  addRide, addTip, deleteRide, deleteTip, eventKinds, getEvent, getFeedback, getRides, getTips, inviteAudience, lodgingLinks, sendFeedback, setAttendance, setEventStatus,
  type AttendanceRole, type EventDetail, type EventRide, type EventTip, type FeedbackSummary,
} from "@/lib/events-data";
import { Select } from "@/components/ui/select";
import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

type Tab = "detalhes" | "hospedagem" | "caronas" | "avaliacoes";
const card = "rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow";
const field = "mt-1.5 w-full rounded-xl border border-[#dbe7e0] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";

export function EventDetailPage({ viewer, eventId }: { viewer: Viewer; eventId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<EventDetail | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("detalhes");
  const [notice, setNotice] = useState(searchParams.get("novo") ? "Evento publicado! Chame seus alunos e seguidores para aparecerem por lá." : "");

  async function reload() {
    const result = await getEvent(eventId, viewer.id);
    setEvent(result.event);
  }

  useEffect(() => {
    let active = true;
    getEvent(eventId, viewer.id).then(result => { if (active) setEvent(result.event); });
    return () => { active = false; };
  }, [eventId, viewer.id]);

  if (event === undefined) return <Shell profile={viewer.role}><div className="space-y-4"><Skeleton className="h-64 rounded-3xl" /><div className="grid gap-4 xl:grid-cols-[1fr_340px]"><Skeleton className="h-80 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div></div></Shell>;
  if (event === null)
    return (
      <Shell profile={viewer.role}>
        <section className={`${card} mx-auto mt-10 max-w-md text-center`}>
          <h1 className="text-xl font-bold">Evento não encontrado</h1>
          <Button onClick={() => router.push("/eventos")} className="mt-5">Ver calendário</Button>
        </section>
      </Shell>
    );

  const isCreator = event.createdBy === viewer.id;
  const started = event.startsOn <= localDate();
  const date = new Date(`${event.startsOn}T12:00:00`);
  const endDate = event.endsOn ? new Date(`${event.endsOn}T12:00:00`) : null;
  const tabs: [Tab, string, typeof Info][] = [["detalhes", "Detalhes", Info], ["hospedagem", "Hospedagem", BedDouble], ["caronas", "Caronas", Car], ...(started ? [["avaliacoes", "Avaliações", MessageSquareQuote] as [Tab, string, typeof Info]] : [])];

  async function share() {
    const text = `${event!.title} · ${date.toLocaleDateString("pt-BR")} · ${event!.city}/${event!.state}`;
    if (navigator.share) await navigator.share({ title: event!.title, text, url: window.location.href }).catch(() => undefined);
    else { await navigator.clipboard?.writeText(`${text} ${window.location.href}`); setNotice("Link copiado."); }
  }

  return (
    <Shell profile={viewer.role}>
      <button onClick={() => router.push("/eventos")} className="flex items-center gap-2 text-sm font-bold text-[#087a50]"><ArrowLeft size={16} />Calendário</button>

      <section className="relative mt-4 overflow-hidden rounded-3xl bg-[#07352b] text-white soft-shadow">
        {event.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- public cover from Supabase Storage
          <img src={event.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#041f19] via-[#07352b]/70 to-transparent" />
        <Trophy size={160} className="absolute -right-8 -top-6 rotate-12 text-white/5" />
        <div className="relative p-6 pt-24 md:p-8 md:pt-32">
          <p className="text-xs font-bold tracking-[.16em] text-[#b8e986]">{eventKinds[event.kind].toUpperCase()} · {event.federationName.toUpperCase()}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{event.title}</h1>
          {event.status === "cancelled" && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#b94242] px-3 py-1 text-sm font-bold"><XCircle size={15} />Evento cancelado</p>}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-emerald-50">
            <span className="flex items-center gap-1.5"><CalendarDays size={16} />{date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}{endDate ? ` a ${endDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}` : ""}</span>
            <span className="flex items-center gap-1.5"><MapPin size={16} />{event.venue ? `${event.venue} · ` : ""}{event.city}/{event.state}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {event.registrationUrl && <a href={event.registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#b8e986] px-4 py-2.5 text-sm font-bold text-[#07352b] hover:bg-[#c8f49d]"><ExternalLink size={16} />Inscrições</a>}
            <button onClick={share} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/25"><Share2 size={16} />Compartilhar</button>
            {isCreator && (
              <>
                <button onClick={() => router.push(`/eventos/${event.id}/editar`)} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/25"><Pencil size={16} />Editar</button>
                <button
                  onClick={async () => { const next = event.status === "cancelled" ? "published" : "cancelled"; const { error } = await setEventStatus(event.id, next); if (!error) reload(); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/25"
                >
                  {event.status === "cancelled" ? "Reativar" : "Cancelar evento"}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {notice && (
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-2 rounded-2xl bg-[#e7f4ec] p-4 text-sm font-semibold text-[#176340]">
            <CheckCircle2 size={17} />{notice}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div>
          <div className="flex gap-1 overflow-x-auto rounded-2xl bg-[#eaf2ee] p-1">
            {tabs.map(([value, text, Icon]) => (
              <button key={value} onClick={() => setTab(value)} className={`relative flex shrink-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${tab === value ? "text-[#07352b]" : "text-[#71837b]"}`}>
                {tab === value && <motion.span layoutId="event-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
                <span className="relative flex items-center gap-2"><Icon size={16} />{text}</span>
              </button>
            ))}
          </div>
          {/* Slide-in only, so switching never waits on an exit animation. */}
          <motion.div key={tab} initial={{ y: 8 }} animate={{ y: 0 }} transition={{ duration: 0.2 }} className="mt-4">
              {tab === "detalhes" && <Details event={event} />}
              {tab === "hospedagem" && <Lodging event={event} viewer={viewer} />}
              {tab === "caronas" && <Rides event={event} viewer={viewer} />}
              {tab === "avaliacoes" && <Feedback event={event} viewer={viewer} />}
          </motion.div>
        </div>

        <aside className="space-y-4">
          <Attendance event={event} viewer={viewer} onChange={reload} />
          {isCreator && event.status === "published" && (
            <section className={card}>
              <h3 className="flex items-center gap-2 font-bold"><Megaphone size={18} className="text-[#087a50]" />Chamar os fãs</h3>
              <p className="mt-1 text-sm text-[#71837b]">Avisa seus alunos ativos e seguidores sobre o evento. Dá para usar uma vez.</p>
              <Button
                disabled={Boolean(event.audienceInvitedAt)}
                onClick={async () => { const { sent, error } = await inviteAudience(event.id); if (!error) { setNotice(sent ? `${sent} ${sent === 1 ? "pessoa avisada" : "pessoas avisadas"}.` : "Ninguém para avisar ainda."); reload(); } }}
                className="mt-4 w-full"
              >
                {event.audienceInvitedAt ? "Convite já enviado" : "Avisar alunos e seguidores"}
              </Button>
            </section>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function Details({ event }: { event: EventDetail }) {
  return (
    <section className={card}>
      {event.categories.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-[#52665e]">Categorias</h3>
          <div className="mt-2 flex flex-wrap gap-2">{event.categories.map(category => <span key={category} className="rounded-full bg-[#e7f4ec] px-3 py-1 text-sm font-semibold text-[#076841]">{category}</span>)}</div>
        </>
      )}
      <h3 className="mt-5 text-sm font-bold text-[#52665e]">Sobre</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#40564e]">{event.description || "O organizador ainda não adicionou uma descrição."}</p>
      {event.address && (
        <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${event.address}, ${event.city} ${event.state}`)}`} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-2 rounded-2xl bg-[#f7faf8] p-4 text-sm font-semibold text-[#285248] hover:bg-[#eef6f1]">
          <Map size={17} className="text-[#087a50]" />{event.address} · {event.city}/{event.state}<ExternalLink size={14} className="ml-auto" />
        </a>
      )}
      <p className="mt-5 text-xs text-[#91a39b]">Cadastrado por {event.creatorName}. Confirme horários e regulamento com a organização.</p>
    </section>
  );
}

function Attendance({ event, viewer, onChange }: { event: EventDetail; viewer: Viewer; onChange: () => void }) {
  const router = useRouter();
  const [category, setCategory] = useState(event.attendees.find(item => item.id === viewer.id)?.category ?? event.categories[0] ?? "");
  const [busy, setBusy] = useState(false);
  const mine = event.viewerRole;
  const options: [AttendanceRole, string][] = [["atleta", "Vou competir"], ["torcida", "Vou assistir"], ...(viewer.role === "professional" ? [["treinador", "Vou como treinador"] as [AttendanceRole, string]] : [])];
  const athletes = event.attendees.filter(item => item.role === "atleta");
  const others = event.attendees.filter(item => item.role !== "atleta");

  async function choose(role: AttendanceRole) {
    setBusy(true);
    const { error } = await setAttendance(event.id, viewer.id, mine === role ? null : role, category);
    setBusy(false);
    if (!error) onChange();
  }

  return (
    <section className={card}>
      <h3 className="flex items-center gap-2 font-bold"><Users size={18} className="text-[#087a50]" />Quem vai</h3>
      {event.status === "published" && (
        <div className="mt-3 space-y-2">
          {options.map(([role, text]) => (
            <button key={role} disabled={busy} onClick={() => choose(role)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition ${mine === role ? "border-[#087a50] bg-[#087a50] text-white" : "border-[#dbe7e0] text-[#285248] hover:border-[#9cc7b1]"}`}>
              {text}{mine === role && <CheckCircle2 size={17} />}
            </button>
          ))}
          {event.categories.length > 0 && (mine === "atleta" || !mine) && (
            <div className="text-xs font-bold text-[#52665e]">Categoria em que vai competir
              <Select
                size="sm"
                className="mt-1.5"
                value={category}
                onChange={async next => { setCategory(next); if (mine === "atleta") { await setAttendance(event.id, viewer.id, "atleta", next); onChange(); } }}
                options={event.categories.map(item => ({ value: item, label: item }))}
              />
            </div>
          )}
        </div>
      )}
      <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#91a39b]">{athletes.length} competindo</p>
      <div className="mt-2 space-y-2">
        {athletes.slice(0, 8).map(person => (
          <button key={person.id} onClick={() => router.push(`/u/${person.id}`)} className="flex w-full items-center gap-2.5 rounded-xl px-1 py-1 text-left hover:bg-[#f3f8f5]">
            <FramedAvatar author={person} size="sm" />
            <span className="min-w-0"><span className="block truncate text-sm font-bold">{person.name}</span>{person.category && <span className="block text-xs text-[#71837b]">{person.category}</span>}</span>
          </button>
        ))}
      </div>
      {others.length > 0 && (
        <>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#91a39b]">{others.length} na torcida e equipe</p>
          <div className="mt-2 flex -space-x-2">
            {others.slice(0, 10).map(person => <button key={person.id} onClick={() => router.push(`/u/${person.id}`)} title={person.name}><FramedAvatar author={{ ...person, frame: "none" }} size="sm" /></button>)}
          </div>
        </>
      )}
    </section>
  );
}

function Lodging({ event, viewer }: { event: EventDetail; viewer: Viewer }) {
  const links = lodgingLinks(event);
  const [tips, setTips] = useState<EventTip[] | null>(null);
  const [form, setForm] = useState({ kind: "hospedagem" as EventTip["kind"], body: "", url: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getTips(event.id).then(rows => { if (active) setTips(rows); });
    return () => { active = false; };
  }, [event.id]);

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (form.body.trim().length < 3) return setError("Escreva a dica.");
    if (form.url && !/^https?:\/\//.test(form.url)) return setError("O link precisa começar com http:// ou https://");
    const { error: saveError } = await addTip(event.id, viewer.id, form);
    if (saveError) return setError("Não foi possível salvar.");
    setForm({ kind: form.kind, body: "", url: "" });
    setError("");
    setTips(await getTips(event.id));
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <h3 className="font-bold">Onde ficar em {event.city}</h3>
        <p className="mt-1 text-sm text-[#71837b]">Busca já filtrada pelas datas do evento (chegada um dia antes).</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <a href={links.airbnb} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-[#ff385c] px-4 py-3 text-sm font-bold text-white hover:brightness-110">Airbnb<ExternalLink size={14} /></a>
          <a href={links.booking} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-[#003580] px-4 py-3 text-sm font-bold text-white hover:brightness-110">Booking<ExternalLink size={14} /></a>
          <a href={links.maps} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-[#dbe7e0] px-4 py-3 text-sm font-bold text-[#285248] hover:bg-[#f3f8f5]">Mapa<ExternalLink size={14} /></a>
        </div>
      </section>
      <section className={card}>
        <h3 className="font-bold">Dicas da comunidade</h3>
        <form onSubmit={submit} className="mt-3 grid gap-2">
          <div className="flex gap-2">
            {(["hospedagem", "alimentacao", "geral"] as const).map(kind => (
              <button type="button" key={kind} onClick={() => setForm({ ...form, kind })} className={`rounded-full border px-3 py-1 text-xs font-bold ${form.kind === kind ? "border-[#087a50] bg-[#e7f4ec] text-[#076841]" : "border-[#dbe7e0] text-[#52665e]"}`}>
                {kind === "hospedagem" ? "Hospedagem" : kind === "alimentacao" ? "Alimentação" : "Geral"}
              </button>
            ))}
          </div>
          <textarea value={form.body} onChange={event => setForm({ ...form, body: event.target.value })} maxLength={500} placeholder="Ex.: Hotel a 5 min do ginásio, tem cozinha para preparar as refeições." className={`${field} min-h-20`} />
          <input value={form.url} onChange={event => setForm({ ...form, url: event.target.value })} placeholder="Link (opcional)" className={field} />
          {error && <p className="text-sm font-semibold text-[#b94242]">{error}</p>}
          <Button type="submit" className="justify-self-end px-4 py-2 text-sm">Compartilhar dica</Button>
        </form>
        <div className="mt-4 space-y-3">
          {tips === null ? <ListSkeleton rows={2} /> : tips.length === 0 ? <p className="text-sm text-[#71837b]">Nenhuma dica ainda.</p> : tips.map(tip => (
            <article key={tip.id} className="flex gap-3 rounded-2xl bg-[#f7faf8] p-3">
              <FramedAvatar author={tip.author} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{tip.author.name} <span className="font-normal text-[#91a39b]">· {tip.kind === "hospedagem" ? "Hospedagem" : tip.kind === "alimentacao" ? "Alimentação" : "Geral"} · {timeAgo(tip.createdAt)}</span></p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#1d3b33]">{tip.body}</p>
                {tip.url && <a href={tip.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#087a50]">Abrir link<ExternalLink size={12} /></a>}
              </div>
              {(tip.author.id === viewer.id || event.createdBy === viewer.id) && (
                <button onClick={async () => { const { error: deleteError } = await deleteTip(tip.id); if (!deleteError) setTips(current => (current ?? []).filter(item => item.id !== tip.id)); }} aria-label="Excluir dica" className="self-start p-1 text-[#b3c2bb] hover:text-[#b94242]"><Trash2 size={14} /></button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Rides({ event, viewer }: { event: EventDetail; viewer: Viewer }) {
  const router = useRouter();
  const [rides, setRides] = useState<EventRide[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "oferta" as EventRide["kind"], fromCity: "", departureDate: event.startsOn, seats: "3", contact: "", note: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getRides(event.id).then(rows => { if (active) setRides(rows); });
    return () => { active = false; };
  }, [event.id]);

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (form.fromCity.trim().length < 2) return setError("Informe a cidade de saída.");
    const { error: saveError } = await addRide(event.id, viewer.id, { ...form, seats: form.kind === "oferta" ? Number(form.seats) || undefined : undefined });
    if (saveError) return setError("Não foi possível salvar.");
    setOpen(false);
    setError("");
    setRides(await getRides(event.id));
  }

  return (
    <div className="space-y-4">
      <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">Caronas para {event.city}</h3>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-[#71837b]"><ShieldCheck size={14} className="mt-0.5 shrink-0" />O Evolink só conecta as pessoas. Combinem direto entre vocês e dividam o combustível; não há pagamento pelo app.</p>
        </div>
        <Button onClick={() => setOpen(value => !value)} className="px-4 py-2 text-sm"><Car size={16} />{open ? "Fechar" : "Oferecer ou pedir"}</Button>
      </section>
      <AnimatePresence initial={false}>
        {open && (
          <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={submit} className={`${card} grid gap-3 overflow-hidden sm:grid-cols-2`}>
            <div className="flex gap-2 sm:col-span-2">
              {(["oferta", "pedido"] as const).map(kind => (
                <button type="button" key={kind} onClick={() => setForm({ ...form, kind })} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${form.kind === kind ? "border-[#087a50] bg-[#e7f4ec] text-[#076841]" : "border-[#dbe7e0] text-[#52665e]"}`}>
                  {kind === "oferta" ? "Tenho vagas" : "Preciso de carona"}
                </button>
              ))}
            </div>
            <label className="text-xs font-bold">Saindo de<input value={form.fromCity} onChange={event => setForm({ ...form, fromCity: event.target.value })} placeholder="Ex.: Canoas" className={field} /></label>
            <label className="text-xs font-bold">Data<input type="date" value={form.departureDate} onChange={event => setForm({ ...form, departureDate: event.target.value })} className={field} /></label>
            {form.kind === "oferta" && <label className="text-xs font-bold">Vagas<input value={form.seats} onChange={event => setForm({ ...form, seats: event.target.value })} inputMode="numeric" className={field} /></label>}
            <label className="text-xs font-bold">Contato (opcional)<input value={form.contact} onChange={event => setForm({ ...form, contact: event.target.value })} placeholder="WhatsApp ou @instagram" className={field} /></label>
            <label className="text-xs font-bold sm:col-span-2">Observação<input value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="Horário, ponto de encontro..." className={field} /></label>
            {error && <p className="text-sm font-semibold text-[#b94242] sm:col-span-2">{error}</p>}
            <Button type="submit" className="sm:col-span-2">Publicar</Button>
          </motion.form>
        )}
      </AnimatePresence>
      {rides === null ? <div className="h-24 animate-pulse rounded-3xl bg-white soft-shadow" /> : rides.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-[#cfe3d8] bg-white p-6 text-center text-sm text-[#71837b]">Nenhuma carona ainda. Seja o primeiro a oferecer.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rides.map(ride => (
            <article key={ride.id} className={card}>
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ride.kind === "oferta" ? "bg-[#e7f4ec] text-[#087a50]" : "bg-[#fff4d8] text-[#9a6800]"}`}>{ride.kind === "oferta" ? `Oferece ${ride.seats ?? ""} ${ride.seats === 1 ? "vaga" : "vagas"}` : "Procura carona"}</span>
                {ride.author.id === viewer.id && <button onClick={async () => { const { error: deleteError } = await deleteRide(ride.id); if (!deleteError) setRides(current => (current ?? []).filter(item => item.id !== ride.id)); }} aria-label="Excluir" className="p-1 text-[#b3c2bb] hover:text-[#b94242]"><Trash2 size={14} /></button>}
              </div>
              <p className="mt-3 text-lg font-bold">{ride.fromCity} → {event.city}</p>
              {ride.departureDate && <p className="text-sm text-[#71837b]">{new Date(`${ride.departureDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</p>}
              {ride.note && <p className="mt-2 text-sm text-[#40564e]">{ride.note}</p>}
              <button onClick={() => router.push(`/u/${ride.author.id}`)} className="mt-3 flex items-center gap-2 text-left">
                <FramedAvatar author={ride.author} size="sm" />
                <span><span className="block text-sm font-bold">{ride.author.name}</span>{ride.contact && <span className="block text-xs text-[#087a50]">{ride.contact}</span>}</span>
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const criteria = [["organization", "Organização"], ["judging", "Julgamento"], ["structure", "Estrutura"], ["punctuality", "Pontualidade"]] as const;

function Feedback({ event, viewer }: { event: EventDetail; viewer: Viewer }) {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [sent, setSent] = useState(false);
  const [ratings, setRatings] = useState({ organization: 0, judging: 0, structure: 0, punctuality: 0 });
  const [comment, setComment] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getFeedback(event.id, viewer.id).then(result => { if (active) { setSummary(result.summary); setSent(result.alreadySent); } });
    return () => { active = false; };
  }, [event.id, viewer.id]);

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (Object.values(ratings).some(value => value === 0)) return setError("Dê uma nota para cada item.");
    if (!accepted) return setError("Aceite as regras para enviar.");
    const { error: saveError } = await sendFeedback(event.id, viewer.id, { ...ratings, comment });
    if (saveError) return setError("Não foi possível enviar.");
    setSent(true);
    setSummary((await getFeedback(event.id, viewer.id)).summary);
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <h3 className="flex items-center gap-2 font-bold"><ShieldCheck size={18} className="text-[#087a50]" />Avaliação anônima do evento</h3>
        <p className="mt-1 text-sm text-[#71837b]">Seu nome nunca aparece. Os resultados ajudam atletas e dão retorno às federações.</p>
        {summary && summary.count > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {criteria.map(([key, text]) => (
              <div key={key}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{text}</span><span className="font-bold">{String(summary[key] ?? "–").replace(".", ",")}</span></div>
                <div className="mt-1"><ProgressBar value={Number(summary[key] ?? 0) / 5} /></div>
              </div>
            ))}
            <p className="text-xs text-[#91a39b] sm:col-span-2">{summary.count} {summary.count === 1 ? "avaliação" : "avaliações"}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#71837b]">Nenhuma avaliação ainda.</p>
        )}
      </section>

      {!sent ? (
        <form onSubmit={submit} className={card}>
          <h3 className="font-bold">Como foi esse evento?</h3>
          <div className="mt-3 space-y-3">
            {criteria.map(([key, text]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{text}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(value => (
                    <motion.button whileTap={{ scale: 0.8 }} type="button" key={value} onClick={() => setRatings({ ...ratings, [key]: value })} aria-label={`${text}: ${value}`}>
                      <Star size={24} className={value <= ratings[key] ? "fill-[#ffc53d] text-[#ffc53d]" : "text-[#d5e0da]"} />
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <textarea value={comment} onChange={submitEvent => setComment(submitEvent.target.value)} maxLength={1000} placeholder="Conte o que funcionou e o que precisa melhorar (opcional)." className={`${field} mt-4 min-h-24`} />
          <label className="mt-3 flex gap-2 rounded-2xl bg-[#f7faf8] p-3 text-xs leading-relaxed text-[#52665e]">
            <input type="checkbox" checked={accepted} onChange={submitEvent => setAccepted(submitEvent.target.checked)} className="mt-0.5 accent-[#087a50]" />
            <span>Vou falar sobre o evento com respeito: sem ofensas, acusações sem fundamento ou dados pessoais de terceiros. Comentários que violem as <a href="/termos#termos" target="_blank" rel="noreferrer" className="font-bold text-[#087a50] underline">regras</a> podem ser removidos.</span>
          </label>
          {error && <p className="mt-3 text-sm font-semibold text-[#b94242]">{error}</p>}
          <Button type="submit" className="mt-4 w-full">Enviar avaliação anônima</Button>
        </form>
      ) : (
        <p className="flex items-center gap-2 rounded-2xl bg-[#e7f4ec] p-4 text-sm font-semibold text-[#176340]"><CheckCircle2 size={17} />Obrigado! Sua avaliação foi registrada de forma anônima.</p>
      )}

      {summary && summary.comments.length > 0 && (
        <section className={card}>
          <h3 className="font-bold">O que os atletas disseram</h3>
          <div className="mt-3 space-y-3">
            {summary.comments.map((item, index) => (
              <blockquote key={index} className="rounded-2xl bg-[#f7faf8] p-4 text-sm text-[#1d3b33]">
                “{item.comment}”
                <footer className="mt-1 text-xs text-[#91a39b]">Atleta anônimo · {new Date(`${item.created_on}T12:00:00`).toLocaleDateString("pt-BR")}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
