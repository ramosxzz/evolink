"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, ChevronRight, ClipboardCheck, Copy, Search, UserPlus, Users } from "lucide-react";
import { Avatar, Button, PageTitle, Shell } from "@/components/app-shell";
import { Modal } from "@/components/ui/modal";
import { ListSkeleton } from "@/components/ui/skeleton";
import { createProfessionalInvite, getProfessionalOverview, type Viewer } from "@/lib/evolink-data";

type Overview = Awaited<ReturnType<typeof getProfessionalOverview>>;
type Filter = "todos" | "checkin" | "atraso" | "suspensos";

type Row = {
  id: string;
  name: string;
  goal: string | null;
  since: string | null;
  pendingCheckin: boolean;
  payment: "pending" | "paid" | "overdue" | "waived" | null;
  suspended: boolean;
};

export function StudentsPage({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getProfessionalOverview(viewer.id).then(result => { if (active) setOverview(result); });
    return () => { active = false; };
  }, [viewer.id]);

  const rows = useMemo<Row[]>(() => {
    if (!overview) return [];
    const pending = new Set(overview.pendingCheckins.map(item => item.student_id));
    return overview.students.map(item => {
      const profile = item.profiles as { full_name?: string } | null;
      const student = item.student_profiles as { goal?: string | null; started_at?: string | null; access_status?: string } | null;
      const payments = overview.finance.rows.filter(row => row.studentId === item.student_id);
      const payment = payments.find(row => row.status === "overdue") ?? payments.find(row => row.status === "pending") ?? payments[0];
      return {
        id: item.student_id,
        name: profile?.full_name ?? "Aluno",
        goal: student?.goal ?? null,
        since: student?.started_at ?? null,
        pendingCheckin: pending.has(item.student_id),
        payment: payment?.status ?? null,
        suspended: student?.access_status === "suspended",
      };
    });
  }, [overview]);

  const counts = {
    todos: rows.length,
    checkin: rows.filter(row => row.pendingCheckin).length,
    atraso: rows.filter(row => row.payment === "overdue").length,
    suspensos: rows.filter(row => row.suspended).length,
  };

  const term = search.trim().toLocaleLowerCase("pt-BR");
  const visible = rows
    .filter(row => filter === "todos" || (filter === "checkin" && row.pendingCheckin) || (filter === "atraso" && row.payment === "overdue") || (filter === "suspensos" && row.suspended))
    .filter(row => !term || `${row.name} ${row.goal ?? ""}`.toLocaleLowerCase("pt-BR").includes(term));

  const filters: [Filter, string][] = [["todos", "Todos"], ["checkin", "Check-in pendente"], ["atraso", "Em atraso"], ["suspensos", "Suspensos"]];

  return (
    <Shell profile="professional">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle title="Alunos" text={overview ? `${rows.length} ${rows.length === 1 ? "aluno" : "alunos"} em acompanhamento.` : "Carregando seus alunos."} />
        <Button onClick={() => setInviteOpen(true)}><UserPlus size={17} />Convidar aluno</Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3.5 transition focus-within:border-[var(--emerald)] focus-within:ring-4 focus-within:ring-[var(--ring)]">
          <Search size={17} className="text-[#8a9c94]" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome ou objetivo" className="w-full bg-transparent py-3 text-sm outline-none" />
        </label>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-[#e9f0ec] p-1">
          {filters.map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className={`relative shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${filter === value ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
              {filter === value && <motion.span layoutId="students-filter" className="absolute inset-0 rounded-lg bg-white shadow-sm" />}
              <span className="relative">{label}{counts[value] > 0 && value !== "todos" ? ` · ${counts[value]}` : ""}</span>
            </button>
          ))}
        </div>
      </div>

      {overview === null ? (
        <div className="mt-5"><ListSkeleton rows={5} /></div>
      ) : visible.length === 0 ? (
        <section className="mt-5 rounded-3xl border border-dashed border-[#cfe3d8] bg-white px-6 py-12 text-center">
          <Users className="mx-auto text-[#9cc7b1]" />
          <h2 className="mt-3 font-bold">{rows.length === 0 ? "Nenhum aluno ainda" : "Ninguém nesse filtro"}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">{rows.length === 0 ? "Envie um convite para começar o primeiro acompanhamento." : "Tente outro filtro ou busca."}</p>
          {rows.length === 0 && <Button onClick={() => setInviteOpen(true)} className="mt-5"><UserPlus size={16} />Convidar aluno</Button>}
        </section>
      ) : (
        <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-[var(--card-shadow)]">
          <div className="hidden grid-cols-[1.6fr_1fr_1fr_40px] gap-4 border-b border-[var(--line)] px-5 py-3 text-xs font-semibold text-[#8a9c94] md:grid">
            <span>Aluno</span><span>Check-in</span><span>Mensalidade</span><span />
          </div>
          <ul>
            {visible.map(row => (
              <li key={row.id} className="border-b border-[#f0f4f2] last:border-0">
                <button onClick={() => router.push(`/profissional/alunos/${row.id}`)} className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-[#f8fbf9] md:grid-cols-[1.6fr_1fr_1fr_40px]">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={row.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{row.name}</span>
                      <span className="block truncate text-xs text-[var(--muted)]">{row.goal ?? "Objetivo não definido"}{row.since ? ` · desde ${new Date(`${row.since}T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}` : ""}</span>
                    </span>
                  </span>
                  <span className="hidden md:block">
                    {row.pendingCheckin ? <Badge tone="warn"><ClipboardCheck size={12} />Aguardando resposta</Badge> : <span className="text-sm text-[#8a9c94]">Em dia</span>}
                  </span>
                  <span className="hidden md:block">
                    {row.suspended ? <Badge tone="danger">Acesso suspenso</Badge> : row.payment === "overdue" ? <Badge tone="danger">Em atraso</Badge> : row.payment === "pending" ? <Badge tone="neutral">A vencer</Badge> : row.payment === "paid" ? <Badge tone="ok">Pago</Badge> : <span className="text-sm text-[#8a9c94]">Sem cobrança</span>}
                  </span>
                  <span className="flex items-center justify-end gap-2">
                    <span className="flex gap-1 md:hidden">
                      {row.pendingCheckin && <Badge tone="warn">Check-in</Badge>}
                      {(row.payment === "overdue" || row.suspended) && <Badge tone="danger">Atraso</Badge>}
                    </span>
                    <ChevronRight size={18} className="text-[#b3c2bb]" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} professionalId={viewer.id} />
    </Shell>
  );
}

function Badge({ tone, children }: { tone: "ok" | "warn" | "danger" | "neutral"; children: React.ReactNode }) {
  const tones = { ok: "bg-[var(--mint)] text-[var(--emerald)]", warn: "bg-[#fff4d8] text-[#8a6100]", danger: "bg-[#fdecea] text-[#b3362f]", neutral: "bg-[#eef3f0] text-[#51645c]" };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function InviteModal({ open, onClose, professionalId }: { open: boolean; onClose: () => void; professionalId: string }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function create() {
    setLoading(true);
    setError("");
    const { data, error: inviteError } = await createProfessionalInvite(professionalId);
    setLoading(false);
    if (inviteError || !data) return setError("Não foi possível criar o convite.");
    setLink(`${window.location.origin}/aluno/perfil?convite=${data.token}`);
  }

  async function copy() {
    await navigator.clipboard?.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (navigator.share) await navigator.share({ title: "Convite Evolink", text: "Use este link para entrar no meu acompanhamento no Evolink:", url: link }).catch(() => undefined);
    else copy();
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setLink(""); setError(""); }} title="Convidar aluno" description="Gere um link individual. Ele vale por 14 dias e funciona uma vez.">
      {!link ? (
        <>
          <ol className="space-y-3 text-sm text-[#40554c]">
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--mint)] text-xs font-bold text-[var(--emerald)]">1</span>Gere o link e envie pelo WhatsApp.</li>
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--mint)] text-xs font-bold text-[var(--emerald)]">2</span>O aluno cria a conta e abre o link.</li>
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--mint)] text-xs font-bold text-[var(--emerald)]">3</span>Ele aparece aqui na sua lista de alunos.</li>
          </ol>
          {error && <p className="mt-4 text-sm font-semibold text-[#b94242]">{error}</p>}
          <Button onClick={create} disabled={loading} className="mt-6 w-full py-3">{loading ? "Gerando..." : "Gerar link de convite"}</Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[#f8fbf9] p-2 pl-3">
            <span className="min-w-0 flex-1 truncate text-sm text-[#40554c]">{link}</span>
            <Button kind="soft" onClick={copy} className="px-3 py-2 text-xs">{copied ? <><Check size={14} />Copiado</> : <><Copy size={14} />Copiar</>}</Button>
          </div>
          <Button onClick={share} className="mt-4 w-full py-3">Compartilhar link</Button>
        </>
      )}
    </Modal>
  );
}
