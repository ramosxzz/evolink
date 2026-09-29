"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import type { Viewer } from "@/lib/evolink-data";
import { bodybuildingCategories, brazilianStates, eventKinds, getEvent, getFederations, saveEvent, type EventInput, type EventKind, type Federation } from "@/lib/events-data";
import { Select } from "@/components/ui/select";

const card = "rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow";
const field = "mt-1.5 w-full rounded-xl border border-[#dbe7e0] bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";
const label = "block text-sm font-bold";

const empty: EventInput = { title: "", kind: "campeonato", federationCode: "ifbb_brasil", federationOther: "", startsOn: "", endsOn: "", city: "", state: "RS", venue: "", address: "", registrationUrl: "", description: "", categories: [] };

export function EventFormPage({ viewer, eventId }: { viewer: Viewer; eventId?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [federations, setFederations] = useState<Federation[]>([]);
  const [values, setValues] = useState<EventInput | null>(eventId ? null : empty);
  const [cover, setCover] = useState<{ file?: File; url: string | null }>({ url: null });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getFederations().then(rows => { if (active) setFederations(rows); });
    if (eventId)
      getEvent(eventId, viewer.id).then(({ event }) => {
        if (!active) return;
        if (!event || event.createdBy !== viewer.id) return setError("Você só pode editar eventos que criou.");
        setValues({
          title: event.title, kind: event.kind, federationCode: event.federationCode, federationOther: event.federationOther ?? "", startsOn: event.startsOn, endsOn: event.endsOn ?? "",
          city: event.city, state: event.state, venue: event.venue ?? "", address: event.address ?? "", registrationUrl: event.registrationUrl ?? "", description: event.description ?? "", categories: event.categories,
        });
        setCover({ url: event.coverUrl });
      });
    return () => { active = false; };
  }, [eventId, viewer.id]);

  useEffect(() => () => { if (cover.file && cover.url) URL.revokeObjectURL(cover.url); }, [cover]);

  if (viewer.role !== "professional")
    return <Shell profile={viewer.role}><p className={`${card} mt-8`}>Somente treinadores podem cadastrar eventos.</p></Shell>;
  if (!values) return <Shell profile="professional">{error ? <p className={`${card} mt-8 text-[#b94242]`}>{error}</p> : <div className="mt-8 h-96 animate-pulse rounded-3xl bg-white soft-shadow" />}</Shell>;

  const set = (key: keyof EventInput) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValues(current => current && { ...current, [key]: event.target.value });
  const toggleCategory = (category: string) => setValues(current => current && { ...current, categories: current.categories.includes(category) ? current.categories.filter(item => item !== category) : [...current.categories, category] });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!values) return;
    if (values.title.trim().length < 3) return setError("Dê um nome ao evento.");
    if (!values.startsOn) return setError("Informe a data do evento.");
    if (values.endsOn && values.endsOn < values.startsOn) return setError("A data final precisa ser depois da inicial.");
    if (values.city.trim().length < 2) return setError("Informe a cidade.");
    if (values.registrationUrl && !/^https?:\/\//.test(values.registrationUrl)) return setError("O link de inscrição precisa começar com http:// ou https://");
    if (values.federationCode === "outra" && !values.federationOther?.trim()) return setError("Informe o nome da federação.");
    setSaving(true);
    setError("");
    const { id, error: saveError } = await saveEvent(viewer.id, values, cover.file, eventId);
    setSaving(false);
    if (saveError || !id) return setError("Não foi possível salvar o evento.");
    router.push(`/eventos/${id}${eventId ? "" : "?novo=1"}`);
  }

  return (
    <Shell profile="professional">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-[#087a50]"><ArrowLeft size={16} />Voltar</button>
      <PageTitle kicker="EVENTOS" title={eventId ? "Editar evento" : "Novo evento"} text="Depois de publicar, você pode chamar seus alunos e seguidores." />
      <form onSubmit={submit} className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className={card}>
            <label className={label}>Nome do evento<input value={values.title} onChange={set("title")} maxLength={120} placeholder="Ex.: Campeonato Gaúcho 2027" className={field} /></label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Select label="Tipo" value={values.kind} onChange={kind => setValues({ ...values, kind: kind as EventKind })} options={Object.entries(eventKinds).map(([value, text]) => ({ value, label: text }))} />
              <Select label="Federação" value={values.federationCode} onChange={federationCode => setValues({ ...values, federationCode })} options={federations.map(item => ({ value: item.code, label: item.name }))} />
            </div>
            {values.federationCode === "outra" && <label className={`${label} mt-4`}>Nome da federação<input value={values.federationOther} onChange={set("federationOther")} maxLength={80} className={field} /></label>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={label}>Data<input type="date" value={values.startsOn} onChange={set("startsOn")} className={field} /></label>
              <label className={label}>Termina em (opcional)<input type="date" value={values.endsOn} onChange={set("endsOn")} className={field} /></label>
            </div>
          </section>

          <section className={card}>
            <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
              <label className={label}>Cidade<input value={values.city} onChange={set("city")} placeholder="Porto Alegre" className={field} /></label>
              <Select label="UF" value={values.state} onChange={state => setValues({ ...values, state })} options={brazilianStates.map(uf => ({ value: uf, label: uf }))} />
            </div>
            <label className={`${label} mt-4`}>Local<input value={values.venue} onChange={set("venue")} placeholder="Nome do ginásio ou centro de eventos" className={field} /></label>
            <label className={`${label} mt-4`}>Endereço<input value={values.address} onChange={set("address")} className={field} /></label>
            <label className={`${label} mt-4`}>Link de inscrição<input value={values.registrationUrl} onChange={set("registrationUrl")} placeholder="https://" className={field} /></label>
          </section>

          <section className={card}>
            <p className={label}>Categorias</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {bodybuildingCategories.map(category => {
                const active = values.categories.includes(category);
                return (
                  <button type="button" key={category} onClick={() => toggleCategory(category)} className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${active ? "border-[#087a50] bg-[#e7f4ec] text-[#076841]" : "border-[#dbe7e0] text-[#52665e]"}`}>
                    {active && <Check size={13} />}{category}
                  </button>
                );
              })}
            </div>
            <label className={`${label} mt-5`}>Descrição<textarea value={values.description} onChange={set("description")} maxLength={2000} placeholder="Regulamento, pesagem, horários, premiação..." className={`${field} min-h-32`} /></label>
          </section>
        </div>

        <aside className="space-y-4">
          <section className={card}>
            <p className={label}>Capa</p>
            <button type="button" onClick={() => inputRef.current?.click()} className="relative mt-2 grid h-44 w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-[#cfe3d8] bg-[#f7faf8] text-sm font-semibold text-[#52665e] transition hover:border-[#087a50]">
              {cover.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview or public cover
                <img src={cover.url} alt="Capa do evento" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="flex items-center gap-2"><Camera size={18} />Escolher imagem</span>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 25 * 1024 * 1024) return setError("A capa precisa ter até 25 MB.");
                setCover({ file, url: URL.createObjectURL(file) });
              }}
            />
            {error && <p className="mt-4 text-sm font-semibold text-[#b94242]">{error}</p>}
            <Button type="submit" disabled={saving} className="mt-5 w-full">{saving ? "Salvando..." : eventId ? "Salvar alterações" : "Publicar evento"}</Button>
          </section>
        </aside>
      </form>
    </Shell>
  );
}
