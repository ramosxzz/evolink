"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MapPin, Monitor, Search, Star, UserSearch } from "lucide-react";
import { PageTitle, Shell } from "@/components/app-shell";
import { FramedAvatar } from "@/components/social/framed-avatar";
import { Reveal } from "@/components/ui/motion";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Viewer } from "@/lib/evolink-data";
import { brazilianStates } from "@/lib/events-data";
import { getCoachDirectory, modalityLabels, priceLabel, specialtyOptions, type CoachCard } from "@/lib/portfolio-data";

const priceOptions = [
  { value: "", label: "Qualquer preço" },
  { value: "15000", label: "Até R$ 150/mês" },
  { value: "25000", label: "Até R$ 250/mês" },
  { value: "40000", label: "Até R$ 400/mês" },
];

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function CoachDirectory({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [coaches, setCoaches] = useState<CoachCard[] | null>(null);
  const [term, setTerm] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [modality, setModality] = useState("");
  const [state, setState] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);

  useEffect(() => {
    let active = true;
    getCoachDirectory().then(result => { if (active) setCoaches(result); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    if (!coaches) return null;
    const query = normalize(term.trim());
    return coaches
      .filter(coach => !onlyOpen || coach.accepting)
      .filter(coach => !specialty || coach.specialties.includes(specialty))
      // "Online e presencial" matches both filters.
      .filter(coach => !modality || coach.modality === modality || coach.modality === "ambos")
      .filter(coach => !state || coach.state === state)
      .filter(coach => !maxPrice || (coach.priceFromCents !== null && coach.priceFromCents <= Number(maxPrice)))
      .filter(coach => !query || normalize([coach.author.name, coach.headline, coach.city, ...coach.specialties].filter(Boolean).join(" ")).includes(query))
      .sort((a, b) => Number(b.accepting) - Number(a.accepting) || (b.rating ?? 0) - (a.rating ?? 0) || b.reviews - a.reviews || b.transformations - a.transformations);
  }, [coaches, term, specialty, modality, state, maxPrice, onlyOpen]);

  return (
    <Shell profile={viewer.role}>
      <PageTitle title="Encontre seu treinador" text="Compare resultados reais, depoimentos de alunos e peça acompanhamento direto pelo app." />

      <div className="mt-6 rounded-3xl bg-white p-4 shadow-[var(--card-shadow)] md:p-5">
        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9c94]" />
          <input value={term} onChange={event => setTerm(event.target.value)} placeholder="Nome, cidade ou especialidade" className="w-full rounded-xl border border-[#dbe7e0] bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-[#9aaba3] focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]" />
        </label>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {["", ...specialtyOptions].map(item => (
            <button key={item || "todos"} onClick={() => setSpecialty(item)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95 ${specialty === item ? "border-[var(--emerald)] bg-[#e7f4ec] text-[#087a50]" : "border-[#dbe7e0] text-[var(--muted)] hover:border-[#b9d6c6]"}`}>
              {item || "Todos"}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Select value={modality} onChange={setModality} options={[{ value: "", label: "Online ou presencial" }, { value: "online", label: "Online" }, { value: "presencial", label: "Presencial" }]} />
          <Select value={state} onChange={setState} placeholder="Brasil todo" options={[{ value: "", label: "Brasil todo" }, ...brazilianStates.map(uf => ({ value: uf, label: uf }))]} />
          <Select value={maxPrice} onChange={setMaxPrice} options={priceOptions} />
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={onlyOpen} onChange={event => setOnlyOpen(event.target.checked)} className="size-4 accent-[#087a50]" />
          Só treinadores com vagas
        </label>
      </div>

      {visible === null ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map(key => <Skeleton key={key} className="h-44 rounded-3xl" />)}</div>
      ) : visible.length === 0 ? (
        <section className="mt-5 rounded-3xl border border-dashed border-[#cfe3d8] bg-white px-6 py-12 text-center">
          <UserSearch className="mx-auto text-[#9cc7b1]" />
          <h2 className="mt-3 font-bold">{coaches?.length ? "Nenhum treinador com esses filtros" : "Ainda não há treinadores publicados"}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">{coaches?.length ? "Tente outra especialidade, estado ou faixa de preço." : "Em breve os treinadores do Evolink aparecem aqui."}</p>
        </section>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {visible.map((coach, index) => (
            <Reveal key={coach.id} index={index}>
              <button onClick={() => router.push(`/treinadores/${coach.id}`)} className="group flex h-full w-full flex-col rounded-3xl bg-white p-5 text-left shadow-[var(--card-shadow)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(7,53,43,.35)] active:scale-[0.99]">
                <span className="flex items-start gap-4">
                  <FramedAvatar author={coach.author} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-base font-bold">{coach.author.name}</span>
                      {!coach.accepting && <span className="shrink-0 rounded-full bg-[#f1f4f2] px-2 py-0.5 text-[11px] font-bold text-[var(--muted)]">Sem vagas</span>}
                    </span>
                    {coach.headline && <span className="mt-0.5 line-clamp-2 block text-sm text-[var(--muted)]">{coach.headline}</span>}
                    <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#35483f]">
                      {coach.rating !== null && <span className="inline-flex items-center gap-1"><Star size={13} className="fill-[#f2b705] text-[#f2b705]" /><strong>{coach.rating.toLocaleString("pt-BR")}</strong> ({coach.reviews})</span>}
                      <span className="inline-flex items-center gap-1"><Monitor size={13} className="text-[var(--emerald)]" />{modalityLabels[coach.modality]}</span>
                      {(coach.city || coach.state) && <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-[var(--emerald)]" />{[coach.city, coach.state].filter(Boolean).join(" · ")}</span>}
                    </span>
                  </span>
                  <ChevronRight size={18} className="mt-1 shrink-0 text-[#b3c4bb] transition group-hover:translate-x-0.5 group-hover:text-[var(--emerald)]" />
                </span>
                <span className="mt-4 flex flex-wrap items-center gap-2">
                  {coach.specialties.slice(0, 3).map(item => <span key={item} className="rounded-full bg-[#e7f4ec] px-2.5 py-1 text-xs font-semibold text-[#087a50]">{item}</span>)}
                  {coach.specialties.length > 3 && <span className="text-xs font-semibold text-[var(--muted)]">+{coach.specialties.length - 3}</span>}
                  <span className="ml-auto text-xs font-bold text-[var(--ink)]">{priceLabel(coach.priceFromCents) ?? ""}</span>
                </span>
                {coach.transformations > 0 && <span className="mt-3 text-xs font-semibold text-[var(--emerald)]">{coach.transformations} {coach.transformations === 1 ? "resultado publicado" : "resultados publicados"}</span>}
              </button>
            </Reveal>
          ))}
        </div>
      )}
    </Shell>
  );
}
