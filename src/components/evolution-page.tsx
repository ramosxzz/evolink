"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Camera, CheckCircle2, ImageIcon, Scale, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { AnimatedNumber, Reveal } from "@/components/ui/motion";
import { addProgressRecord, getProgress, getProgressPhotoUrls, type Viewer } from "@/lib/evolink-data";
import { Skeleton } from "@/components/ui/skeleton";

type ProgressRecord = Awaited<ReturnType<typeof getProgress>>[number];
type Photo = { id: string; storage_path: string };

const card = "rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow";
const field = "mt-2 w-full rounded-xl border border-[#dbe7e0] bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";
const kg = (value: number) => `${value.toFixed(1).replace(".", ",")} kg`;
const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export function EvolutionPage({ viewer }: { viewer: Viewer }) {
  const [version, setVersion] = useState(0);
  return (
    <Shell profile="student">
      <PageTitle kicker="EVOLUÇÃO" title="Acompanhe seu progresso" text="Peso, medidas e fotos privadas, só você e seu profissional veem." />
      <ProgressOverview
        key={version}
        studentId={viewer.id}
        target={viewer.student?.targetWeightKg ?? null}
        aside={<RecordForm viewer={viewer} onSaved={() => setVersion(value => value + 1)} />}
      />
    </Shell>
  );
}

/** Stats, weight chart and history with photos. Read-only; used by the student and the coach. */
export function ProgressOverview({ studentId, target, aside }: { studentId: string; target: number | null; aside?: React.ReactNode }) {
  const [records, setRecords] = useState<ProgressRecord[] | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    getProgress(studentId).then(async rows => {
      if (!active) return;
      setRecords(rows);
      const paths = rows.flatMap(row => ((row.progress_photos ?? []) as Photo[]).map(photo => photo.storage_path));
      const urls = await getProgressPhotoUrls(paths);
      if (active) setPhotoUrls(urls);
    });
    return () => { active = false; };
  }, [studentId]);

  const chart = useMemo(
    () => [...(records ?? [])].reverse().filter(row => row.weight_kg !== null).map(row => ({ date: shortDate(row.recorded_on), weight: Number(row.weight_kg) })),
    [records],
  );
  const current = chart.at(-1)?.weight;
  const first = chart[0]?.weight;
  const delta = current !== undefined && first !== undefined && chart.length > 1 ? current - first : null;
  const remaining = current !== undefined && target ? current - Number(target) : null;

  return (
    <>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Reveal index={0}>
          <Stat icon={Scale} label="PESO ATUAL" value={current} format={kg} empty="Sem registro" />
        </Reveal>
        <Reveal index={1}>
          <Stat
            icon={delta !== null && delta > 0 ? TrendingUp : TrendingDown}
            label="DESDE O INÍCIO"
            value={delta ?? undefined}
            format={value => `${value > 0 ? "+" : ""}${kg(value)}`}
            empty="—"
          />
        </Reveal>
        <Reveal index={2}>
          <Stat
            icon={Target}
            label={target ? `META ${kg(Number(target))}` : "META"}
            value={remaining !== null ? Math.abs(remaining) : undefined}
            format={value => (remaining !== null && Math.abs(remaining) < 0.05 ? "Meta atingida" : `faltam ${kg(value)}`)}
            empty="Não definida"
          />
        </Reveal>
      </div>

      <div className={`mt-4 grid gap-4 ${aside ? "xl:grid-cols-[1.4fr_1fr]" : ""}`}>
        <Reveal index={3} className={card}>
          <h2 className="font-bold">Peso ao longo do tempo</h2>
          {records === null ? (
            <div className="mt-4 h-64 animate-pulse rounded-2xl bg-[#f3f8f5]" />
          ) : chart.length < 2 ? (
            <p className="mt-4 grid h-64 place-items-center rounded-2xl bg-[#f7faf8] text-sm text-[#71837b]">São necessárias pelo menos duas pesagens para o gráfico.</p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="evolutionWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#087a50" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#087a50" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#edf2ef" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71837b" }} axisLine={false} tickLine={false} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 11, fill: "#71837b" }} axisLine={false} tickLine={false} tickFormatter={value => Number(value).toFixed(0)} />
                  <Tooltip formatter={value => [kg(Number(value)), "Peso"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2ece6", fontSize: 12 }} />
                  {target && <ReferenceLine y={Number(target)} stroke="#b8a000" strokeDasharray="4 4" label={{ value: "Meta", fontSize: 11, fill: "#9a6800", position: "insideTopRight" }} />}
                  <Area type="monotone" dataKey="weight" stroke="#087a50" strokeWidth={2.5} fill="url(#evolutionWeight)" dot={{ r: 3, fill: "#087a50" }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Reveal>
        {aside && <Reveal index={4}>{aside}</Reveal>}
      </div>

      <Reveal index={5} className={`${card} mt-4`}>
        <h2 className="font-bold">Histórico</h2>
        {records === null ? (
          <div className="mt-4 space-y-3">{[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-12 rounded-xl" />)}</div>
        ) : records.length === 0 ? (
          <p className="mt-4 text-sm text-[#71837b]">Nenhum registro ainda.</p>
        ) : (
          <div className="mt-4 divide-y divide-[#edf2ef]">
            {records.map((record, index) => {
              const previous = records[index + 1]?.weight_kg;
              const change = record.weight_kg !== null && previous != null ? Number(record.weight_kg) - Number(previous) : null;
              const photos = (record.progress_photos ?? []) as Photo[];
              return (
                <article key={record.id} className="flex items-center gap-4 py-3">
                  <div className="w-16 shrink-0 text-xs font-semibold text-[#71837b]">{shortDate(record.recorded_on)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {record.weight_kg !== null ? kg(Number(record.weight_kg)) : "Sem peso"}
                      {change !== null && Math.abs(change) >= 0.05 && (
                        <span className={`ml-2 text-xs font-bold ${change < 0 ? "text-[#087a50]" : "text-[#9a6800]"}`}>
                          {change > 0 ? "+" : ""}{change.toFixed(1).replace(".", ",")}
                        </span>
                      )}
                      {record.waist_cm && <span className="ml-2 text-xs font-semibold text-[#71837b]">cintura {String(record.waist_cm).replace(".", ",")} cm</span>}
                    </p>
                    {record.note && <p className="truncate text-sm text-[#52665e]">{record.note}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    {photos.map(photo => photoUrls[photo.storage_path] ? (
                      <a key={photo.id} href={photoUrls[photo.storage_path]} target="_blank" rel="noreferrer" className="block h-12 w-12 overflow-hidden rounded-xl bg-[#f3f8f5]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from Supabase Storage */}
                        <img src={photoUrls[photo.storage_path]} alt="Foto de evolução" className="h-full w-full object-cover" />
                      </a>
                    ) : (
                      <span key={photo.id} className="grid h-12 w-12 place-items-center rounded-xl bg-[#f3f8f5] text-[#9cc7b1]"><ImageIcon size={16} /></span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Reveal>
    </>
  );
}

function Stat({ icon: Icon, label, value, format, empty }: { icon: typeof Scale; label: string; value: number | undefined; format: (value: number) => string; empty: string }) {
  return (
    <section className={`${card} h-full`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[.12em] text-[#71837b]">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7f4ec] text-[#087a50]"><Icon size={17} /></span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value === undefined ? <span className="text-base text-[#91a39b]">{empty}</span> : <AnimatedNumber value={value} format={format} />}</p>
    </section>
  );
}

function RecordForm({ viewer, onSaved }: { viewer: Viewer; onSaved: () => void }) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ file: File; url: string }>();
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Release the preview object URL when it is replaced or the form unmounts.
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  function pick(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setStatus({ kind: "error", text: "Escolha uma imagem (JPG, PNG ou WebP)." });
    if (file.size > 25 * 1024 * 1024) return setStatus({ kind: "error", text: "A foto precisa ter até 25 MB." });
    setStatus(null);
    setPhoto({ file, url: URL.createObjectURL(file) });
  }

  function clearPhoto() {
    setPhoto(undefined);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(weight.replace(",", "."));
    if (!value || value < 20 || value > 400) return setStatus({ kind: "error", text: "Informe um peso válido." });
    const waistValue = waist ? Number(waist.replace(",", ".")) : undefined;
    setSaving(true);
    const { error } = await addProgressRecord(viewer.id, value, note, photo?.file, waistValue);
    setSaving(false);
    if (error) return setStatus({ kind: "error", text: "Não foi possível salvar. Tente novamente." });
    setStatus({ kind: "success", text: "Evolução registrada." });
    setWeight(""); setWaist(""); setNote(""); clearPhoto();
    onSaved();
  }

  return (
    <form onSubmit={save} className={`${card} h-full`}>
      <h2 className="font-bold">Novo registro</h2>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold">Peso (kg)
          <input value={weight} onChange={event => setWeight(event.target.value)} inputMode="decimal" placeholder="86,4" className={field} />
        </label>
        <label className="block text-sm font-bold">Cintura (cm)
          <input value={waist} onChange={event => setWaist(event.target.value)} inputMode="decimal" placeholder="Opcional" className={field} />
        </label>
      </div>
      <label className="mt-4 block text-sm font-bold">Como você se sentiu?
        <textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Opcional" className={`${field} min-h-20`} />
      </label>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => pick(event.target.files?.[0])} className="hidden" />
      <AnimatePresence mode="wait" initial={false}>
        {photo ? (
          <motion.div key="preview" initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative mt-4 h-40 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={photo.url} alt="Prévia da foto" className="h-full w-full object-cover" />
            <button type="button" onClick={clearPhoto} aria-label="Remover foto" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white"><X size={16} /></button>
          </motion.div>
        ) : (
          <motion.button
            key="pick"
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={event => event.preventDefault()}
            onDrop={event => { event.preventDefault(); pick(event.dataTransfer.files?.[0]); }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#cfe3d8] py-5 text-sm font-semibold text-[#52665e] transition hover:border-[#087a50] hover:bg-[#f3faf6]"
          >
            <Camera size={18} />Adicionar foto privada
          </motion.button>
        )}
      </AnimatePresence>
      <Button type="submit" disabled={saving} className="mt-5 w-full">{saving ? "Salvando..." : "Registrar evolução"}</Button>
      {status && (
        <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${status.kind === "success" ? "text-[#087a50]" : "text-[#b94242]"}`}>
          {status.kind === "success" && <CheckCircle2 size={16} />}{status.text}
        </p>
      )}
    </form>
  );
}
