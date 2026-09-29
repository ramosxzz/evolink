"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, MapPin, Plus, Trophy, Users } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { Reveal } from "@/components/ui/motion";
import type { Viewer } from "@/lib/evolink-data";
import { brazilianStates, eventKinds, getEvents, getFederations, type EventSummary, type Federation } from "@/lib/events-data";

export function EventsPage({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [period, setPeriod] = useState<"upcoming" | "past">("upcoming");
  const [state, setState] = useState("");
  const [federation, setFederation] = useState("");
  const [federations, setFederations] = useState<Federation[]>([]);
  const [events, setEvents] = useState<EventSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    getFederations().then(rows => { if (active) setFederations(rows); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getEvents(viewer.id, { period, state: state || undefined, federation: federation || undefined }).then(result => { if (active) setEvents(result.events); });
    return () => { active = false; };
  }, [viewer.id, period, state, federation]);

  const months = useMemo(() => {
    const groups: { label: string; items: EventSummary[] }[] = [];
    for (const event of events ?? []) {
      const label = new Date(`${event.startsOn}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const last = groups.at(-1);
      if (last?.label === label) last.items.push(event);
      else groups.push({ label, items: [event] });
    }
    return groups;
  }, [events]);

  const chip = (active: boolean) => `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${active ? "border-[#087a50] bg-[#087a50] text-white" : "border-[#dbe7e0] bg-white text-[#52665e] hover:border-[#9cc7b1]"}`;

  return (
    <Shell profile={viewer.role}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle kicker="EVENTOS" title="Calendário de campeonatos" text="Campeonatos, seletivas e encontros por federação. Marque presença, ache carona e hospedagem." />
        {viewer.role === "professional" && <Button onClick={() => router.push("/eventos/novo")}><Plus size={17} />Criar evento</Button>}
      </div>

      <div className="mt-6 flex gap-1 rounded-2xl bg-[#eaf2ee] p-1 sm:w-fit">
        {([["upcoming", "Próximos"], ["past", "Já aconteceram"]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setPeriod(value)} className={`relative flex-1 rounded-xl px-5 py-2 text-sm font-bold sm:flex-none ${period === value ? "text-[#07352b]" : "text-[#71837b]"}`}>
            {period === value && <motion.span layoutId="events-period" className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setState("")} className={chip(state === "")}>Brasil todo</button>
        <button onClick={() => setState("RS")} className={chip(state === "RS")}>Rio Grande do Sul</button>
        <select value={state && state !== "RS" ? state : ""} onChange={event => setState(event.target.value)} className={`${chip(Boolean(state && state !== "RS"))} outline-none`}>
          <option value="">Outro estado</option>
          {brazilianStates.filter(uf => uf !== "RS").map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFederation("")} className={chip(federation === "")}>Todas as federações</button>
        {federations.map(item => <button key={item.code} onClick={() => setFederation(item.code)} className={chip(federation === item.code)}>{item.name}</button>)}
      </div>

      {events === null ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(item => <div key={item} className="h-72 animate-pulse rounded-3xl bg-white soft-shadow" />)}</div>
      ) : events.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-[#cfe3d8] bg-white p-10 text-center">
          <Trophy className="mx-auto text-[#9cc7b1]" />
          <h2 className="mt-3 text-lg font-bold">Nenhum evento encontrado</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#71837b]">{viewer.role === "professional" ? "Cadastre o próximo campeonato e chame seus alunos." : "Mude os filtros ou peça ao seu treinador para cadastrar o próximo campeonato."}</p>
        </section>
      ) : (
        <AnimatePresence mode="popLayout">
          {months.map((month, monthIndex) => (
            <motion.section key={`${period}-${month.label}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-7">
              <h2 className="text-sm font-bold uppercase tracking-[.14em] text-[#71837b]">{month.label}</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {month.items.map((event, index) => (
                  <Reveal key={event.id} index={monthIndex * 3 + index}>
                    <EventCard event={event} onOpen={() => router.push(`/eventos/${event.id}`)} />
                  </Reveal>
                ))}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      )}
    </Shell>
  );
}

export function EventCard({ event, onOpen }: { event: EventSummary; onOpen: () => void }) {
  const date = new Date(`${event.startsOn}T12:00:00`);
  return (
    <button onClick={onOpen} className="group block h-full w-full overflow-hidden rounded-3xl border border-[#e2ece6] bg-white text-left soft-shadow transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#07352b] via-[#0a5a3e] to-[#2bb673]">
        {event.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- public cover from Supabase Storage
          <img src={event.coverUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <Trophy size={72} className="absolute -bottom-3 -right-3 rotate-12 text-white/10" />
        )}
        <div className="absolute left-3 top-3 rounded-2xl bg-white px-3 py-1.5 text-center shadow-lg">
          <p className="text-lg font-black leading-none text-[#07352b]">{date.getDate()}</p>
          <p className="text-[10px] font-bold uppercase text-[#087a50]">{date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</p>
        </div>
        {event.status === "cancelled" && <span className="absolute right-3 top-3 rounded-full bg-[#b94242] px-2.5 py-1 text-xs font-bold text-white">Cancelado</span>}
        {event.viewerRole && event.status !== "cancelled" && (
          <span className="absolute right-3 top-3 rounded-full bg-[#b8e986] px-2.5 py-1 text-xs font-bold text-[#07352b]">{event.viewerRole === "atleta" ? "Vou competir" : event.viewerRole === "torcida" ? "Vou assistir" : "Vou como treinador"}</span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-bold text-[#087a50]">{eventKinds[event.kind]} · {event.federationName}</p>
        <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-tight">{event.title}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-[#71837b]"><MapPin size={14} />{event.city}/{event.state}{event.venue ? ` · ${event.venue}` : ""}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-[#71837b]"><CalendarDays size={14} />{date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#52665e]"><Users size={13} />{event.athletes} competindo · {event.fans} na torcida</p>
      </div>
    </button>
  );
}
