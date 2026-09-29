"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Crown, Medal, Trophy } from "lucide-react";
import { PageTitle, Shell } from "@/components/app-shell";
import { FramedAvatar } from "@/components/social/framed-avatar";
import { Select } from "@/components/ui/select";
import { ListSkeleton } from "@/components/ui/skeleton";
import type { Viewer } from "@/lib/evolink-data";
import { brazilianStates, getFederations, type Federation } from "@/lib/events-data";
import { getRanking, type RankingRow } from "@/lib/prep-data";

const podium = [
  { place: 2, height: "h-24", tone: "from-[#eef1f4] to-[#c9d1d8]", text: "text-[#4b5660]" },
  { place: 1, height: "h-32", tone: "from-[#fff1b8] to-[#e6b800]", text: "text-[#5c4100]" },
  { place: 3, height: "h-20", tone: "from-[#f6d2b0] to-[#c47a3f]", text: "text-[#5a2a0c]" },
];

export function RankingPage({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [federation, setFederation] = useState("");
  const [state, setState] = useState("");
  const [federations, setFederations] = useState<Federation[]>([]);
  const [rows, setRows] = useState<RankingRow[] | null>(null);

  useEffect(() => {
    let active = true;
    getFederations().then(result => { if (active) setFederations(result); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getRanking(Number(year), federation, state).then(result => { if (active) setRows(result); });
    return () => { active = false; };
  }, [year, federation, state]);

  const top = rows?.slice(0, 3) ?? [];

  return (
    <Shell profile={viewer.role}>
      <PageTitle title="Ranking de atletas" text="Pontos por colocação registrada: 1º 10, 2º 7, 3º 5, 4º e 5º 3, participação 1, overall +5." />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Select value={year} onChange={setYear} options={[currentYear, currentYear - 1, currentYear - 2].map(value => ({ value: String(value), label: String(value) }))} />
        <Select value={federation} onChange={setFederation} placeholder="Todas as federações" options={[{ value: "", label: "Todas as federações" }, ...federations.map(item => ({ value: item.code, label: item.name }))]} />
        <Select value={state} onChange={setState} placeholder="Brasil todo" options={[{ value: "", label: "Brasil todo" }, ...brazilianStates.map(uf => ({ value: uf, label: uf }))]} />
      </div>

      {rows === null ? (
        <div className="mt-6"><ListSkeleton rows={5} /></div>
      ) : rows.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-[#cfe3d8] bg-white px-6 py-12 text-center">
          <Trophy className="mx-auto text-[#9cc7b1]" />
          <h2 className="mt-3 font-bold">Nenhum resultado registrado</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">Os atletas registram suas colocações em Preparação. Elas aparecem aqui.</p>
        </section>
      ) : (
        <>
          {top.length >= 2 && (
            <section className="mt-6 grid grid-cols-3 items-end gap-3 rounded-3xl bg-white px-4 pb-0 pt-6 shadow-[var(--card-shadow)] sm:px-10">
              {podium.map((slot, index) => {
                const row = top[slot.place - 1];
                if (!row) return <div key={slot.place} />;
                return (
                  <button key={slot.place} onClick={() => router.push(`/u/${row.athlete.id}`)} className="flex flex-col items-center gap-2 text-center">
                    {slot.place === 1 && <Crown size={20} className="text-[#d9a300]" />}
                    <FramedAvatar author={row.athlete} size={slot.place === 1 ? "lg" : "md"} />
                    <span className="line-clamp-1 text-sm font-semibold">{row.athlete.name}</span>
                    <span className="text-xs font-bold text-[var(--emerald)] tabular">{row.points} pts</span>
                    <motion.span
                      initial={reduceMotion ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.1 * index, type: "spring", stiffness: 120, damping: 16 }}
                      className={`mt-1 grid w-full origin-bottom place-items-center rounded-t-2xl bg-gradient-to-b ${slot.tone} ${slot.height}`}
                    >
                      <span className={`text-2xl font-black ${slot.text}`}>{slot.place}º</span>
                    </motion.span>
                  </button>
                );
              })}
            </section>
          )}
          <ol className="mt-4 overflow-hidden rounded-3xl bg-white shadow-[var(--card-shadow)]">
            {rows.map((row, index) => (
              <li key={row.athlete.id} className={`border-b border-[#f0f4f2] last:border-0 ${row.athlete.id === viewer.id ? "bg-[#f3faf6]" : ""}`}>
                <button onClick={() => router.push(`/u/${row.athlete.id}`)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-[#f8fbf9]">
                  <span className="w-7 text-center text-sm font-bold text-[var(--muted)] tabular">{index + 1}</span>
                  <FramedAvatar author={row.athlete} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{row.athlete.name}{row.athlete.id === viewer.id ? " (você)" : ""}</span>
                    <span className="block text-xs text-[var(--muted)]">{row.competitions} {row.competitions === 1 ? "campeonato" : "campeonatos"}</span>
                  </span>
                  <span className="hidden items-center gap-3 text-xs font-semibold text-[var(--muted)] sm:flex">
                    {row.titles > 0 && <span className="flex items-center gap-1 text-[#8a6d00]"><Trophy size={13} />{row.titles}</span>}
                    {row.podiums > 0 && <span className="flex items-center gap-1"><Medal size={13} />{row.podiums}</span>}
                  </span>
                  <span className="w-16 text-right text-sm font-bold tabular">{row.points} pts</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </Shell>
  );
}
