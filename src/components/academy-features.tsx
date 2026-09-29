"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  AlertCircle,
  Apple,
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Dumbbell,
  Footprints,
  GlassWater,
  HeartPulse,
  History,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  TimerReset,
  TrendingDown,
  Users,
} from "lucide-react";
import { Avatar, Button, PageTitle, Shell } from "@/components/evolink-app";

type PaymentStatus = "paid" | "pending" | "overdue";
type StudentStatus = "Em dia" | "Atenção" | "Suspenso";

const people = [
  {
    id: "lucas-martins",
    name: "Lucas Martins",
    goal: "Redução de gordura",
    weight: "86,4 kg",
    last: "Hoje, 08:42",
    checkin: "Pendente",
    adherence: 84,
    due: "12 ago",
    payment: "pending" as PaymentStatus,
    status: "Atenção" as StudentStatus,
  },
  {
    id: "mariana-alves",
    name: "Mariana Alves",
    goal: "Ganho de massa",
    weight: "62,1 kg",
    last: "Hoje, 07:15",
    checkin: "Respondido",
    adherence: 93,
    due: "18 ago",
    payment: "paid" as PaymentStatus,
    status: "Em dia" as StudentStatus,
  },
  {
    id: "rafael-nunes",
    name: "Rafael Nunes",
    goal: "Qualidade de vida",
    weight: "94,8 kg",
    last: "Há 6 dias",
    checkin: "Atrasado",
    adherence: 47,
    due: "05 ago",
    payment: "overdue" as PaymentStatus,
    status: "Suspenso" as StudentStatus,
  },
  {
    id: "beatriz-costa",
    name: "Beatriz Costa",
    goal: "Redução de gordura",
    weight: "71,2 kg",
    last: "Ontem, 20:10",
    checkin: "Pendente",
    adherence: 68,
    due: "10 ago",
    payment: "pending" as PaymentStatus,
    status: "Atenção" as StudentStatus,
  },
];

const card = "rounded-3xl border border-[#e2ece6] bg-white soft-shadow";
const field =
  "mt-2 w-full rounded-xl border border-[#dbe7e0] bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";

function StatusBadge({
  status,
}: {
  status: StudentStatus | PaymentStatus | string;
}) {
  const tone =
    status === "Em dia" || status === "paid" || status === "Respondido"
      ? "bg-[#e7f4ec] text-[#087a50]"
      : status === "Suspenso" || status === "overdue" || status === "Atrasado"
        ? "bg-[#fdebea] text-[#b94242]"
        : "bg-[#fff4d8] text-[#9a6800]";
  const label =
    status === "paid"
      ? "Pago"
      : status === "pending"
        ? "Pendente"
        : status === "overdue"
          ? "Atrasado"
          : status;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#173f34] px-4 py-3 text-sm font-semibold text-white shadow-xl"
    >
      <CheckCircle2 size={17} className="text-[#b8e986]" />
      {message}
    </motion.div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  warning?: boolean;
}) {
  return (
    <article className={`${card} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[.12em] text-[#71837b]">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${warning ? "bg-[#fff1d2] text-[#a97000]" : "bg-[#e7f4ec] text-[#087a50]"}`}
        >
          <Icon size={20} />
        </span>
      </div>
      <p
        className={`mt-4 text-xs font-semibold ${warning ? "text-[#a97000]" : "text-[#168257]"}`}
      >
        {detail}
      </p>
    </article>
  );
}

export function AcademyDashboard() {
  const router = useRouter();
  const queue = [
    {
      person: "Rafael Nunes",
      reason: "Mensalidade atrasada há 5 dias",
      meta: "Acesso suspenso",
      icon: CircleDollarSign,
      href: "/profissional/financeiro",
    },
    {
      person: "Lucas Martins",
      reason: "Check-in aguardando revisão",
      meta: "Enviado há 2h",
      icon: HeartPulse,
      href: "/profissional/check-ins",
    },
    {
      person: "Beatriz Costa",
      reason: "Aderência abaixo da meta",
      meta: "68% nos últimos 7 dias",
      icon: TrendingDown,
      href: "/profissional/alunos/beatriz-costa",
    },
    {
      person: "Rafael Nunes",
      reason: "Sem acessar a plataforma",
      meta: "Último acesso há 6 dias",
      icon: Clock3,
      href: "/profissional/alunos/rafael-nunes",
    },
  ];
  return (
    <Shell profile="professional">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          kicker="CENTRAL OPERACIONAL"
          title="Bom dia, Camila."
          text="Prioridades da consultoria organizadas por impacto."
        />
        <Button onClick={() => router.push("/profissional/alunos")}>
          <Plus size={17} /> Novo aluno
        </Button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="ALUNOS ATIVOS"
          value="38"
          detail="+3 neste mês"
          icon={Users}
        />
        <Metric
          label="PRECISAM DE ATENÇÃO"
          value="6"
          detail="2 prioridades altas"
          icon={AlertCircle}
          warning
        />
        <Metric
          label="CHECK-INS PENDENTES"
          value="7"
          detail="3 enviados hoje"
          icon={HeartPulse}
          warning
        />
        <Metric
          label="RECEITA PREVISTA"
          value="R$ 7,6 mil"
          detail="92% recebido em agosto"
          icon={CircleDollarSign}
        />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className={`${card} p-5 md:p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Fila de atenção</h2>
              <p className="mt-1 text-sm text-[#71837b]">
                O que merece sua ação primeiro.
              </p>
            </div>
            <span className="rounded-xl bg-[#fff1d2] px-3 py-2 text-xs font-bold text-[#9a6800]">
              4 ações
            </span>
          </div>
          <div className="mt-4 divide-y divide-[#edf2ef]">
            {queue.map(({ person, reason, meta, icon: Icon, href }) => (
              <button
                key={`${person}-${reason}`}
                onClick={() => router.push(href)}
                className="group flex w-full items-center gap-3 py-4 text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0f7f3] text-[#087a50] transition group-hover:bg-[#e0f1e7]">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{person}</b>
                  <span className="block truncate text-sm text-[#52665e]">
                    {reason}
                  </span>
                </span>
                <span className="hidden text-xs text-[#91a39b] sm:block">
                  {meta}
                </span>
                <ChevronRight size={17} className="text-[#91a39b]" />
              </button>
            ))}
          </div>
        </section>
        <section className={`${card} p-5 md:p-6`}>
          <h2 className="text-lg font-bold">Saúde da operação</h2>
          <p className="mt-1 text-sm text-[#71837b]">Últimos 7 dias.</p>
          <div className="mt-6 space-y-5">
            {[
              ["Aderência média", 82, "32 alunos na meta"],
              ["Check-ins respondidos", 74, "23 de 31 recebidos"],
              ["Mensalidades recebidas", 92, "R$ 7.032 de R$ 7.640"],
            ].map(([label, value, text]) => (
              <div key={String(label)}>
                <div className="flex justify-between text-sm">
                  <b>{label}</b>
                  <span className="font-bold text-[#087a50]">{value}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e9f0ec]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-[#46a779]"
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#71837b]">{text}</p>
              </div>
            ))}
          </div>
          <Button
            kind="outline"
            onClick={() => router.push("/profissional/financeiro")}
            className="mt-7 w-full"
          >
            Abrir financeiro <ChevronRight size={16} />
          </Button>
        </section>
      </div>
      <section className={`${card} mt-6 p-5 md:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Alunos monitorados</h2>
            <p className="mt-1 text-sm text-[#71837b]">
              Último acesso, aderência e situação atual.
            </p>
          </div>
          <Button
            kind="soft"
            onClick={() => router.push("/profissional/alunos")}
            className="py-2 text-xs"
          >
            Ver ficha completa
          </Button>
        </div>
        <StudentTable compact />
      </section>
    </Shell>
  );
}

function StudentTable({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[1.5fr_1fr_.7fr_.8fr_.7fr_auto] gap-4 border-b border-[#edf2ef] px-3 py-3 text-[11px] font-bold tracking-wide text-[#71837b]">
          <span>ALUNO</span>
          <span>ÚLTIMO ACESSO</span>
          <span>ADERÊNCIA</span>
          <span>CHECK-IN</span>
          <span>STATUS</span>
          <span />
        </div>
        {people.slice(0, compact ? 4 : people.length).map((person) => (
          <button
            key={person.id}
            onClick={() => router.push(`/profissional/alunos/${person.id}`)}
            className="grid w-full grid-cols-[1.5fr_1fr_.7fr_.8fr_.7fr_auto] items-center gap-4 border-b border-[#edf2ef] px-3 py-4 text-left transition hover:bg-[#f8fbf9]"
          >
            <span className="flex items-center gap-3">
              <Avatar name={person.name} />
              <span>
                <b className="block text-sm">{person.name}</b>
                <span className="text-xs text-[#71837b]">{person.goal}</span>
              </span>
            </span>
            <span className="text-sm text-[#52665e]">{person.last}</span>
            <span>
              <b
                className={
                  person.adherence < 70 ? "text-[#b94242]" : "text-[#087a50]"
                }
              >
                {person.adherence}%
              </b>
            </span>
            <span className="text-sm text-[#52665e]">{person.checkin}</span>
            <StatusBadge status={person.status} />
            <ChevronRight size={17} className="text-[#91a39b]" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function StudentDirectoryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const shown = people.filter(
    (person) =>
      person.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "Todos" || person.status === filter),
  );
  return (
    <Shell profile="professional">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          kicker="ALUNOS"
          title="Sua comunidade"
          text="Acesse a jornada completa de cada aluno."
        />
        <Button>
          <Plus size={17} /> Cadastrar aluno
        </Button>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <label className="flex min-w-64 flex-1 items-center gap-2 rounded-xl border border-[#dbe7e0] bg-white px-4">
          <Search size={18} className="text-[#91a39b]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome"
            className="w-full py-3 text-sm outline-none"
          />
        </label>
        <div className="flex gap-2">
          {["Todos", "Atenção", "Suspenso"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-xl px-4 py-3 text-sm font-bold ${filter === item ? "bg-[#173f34] text-white" : "border border-[#dbe7e0] bg-white text-[#52665e]"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <section className={`${card} mt-5 p-4 md:p-5`}>
        {shown.length ? (
          <StudentTable />
        ) : (
          <p className="p-8 text-center text-sm text-[#71837b]">
            Nenhum aluno encontrado com esses filtros.
          </p>
        )}
      </section>
    </Shell>
  );
}

export function FinancePage() {
  const [rows, setRows] = useState(people);
  const [tab, setTab] = useState<"all" | PaymentStatus>("all");
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered =
    tab === "all" ? rows : rows.filter((row) => row.payment === tab);
  function paid(id: string) {
    setRows((value) =>
      value.map((row) =>
        row.id === id
          ? {
              ...row,
              payment: "paid" as PaymentStatus,
              status: "Em dia" as StudentStatus,
            }
          : row,
      ),
    );
    setToast("Pagamento confirmado e acesso liberado.");
    setSelected(null);
  }
  function suspend(id: string) {
    setRows((value) =>
      value.map((row) =>
        row.id === id
          ? {
              ...row,
              status:
                row.status === "Suspenso"
                  ? "Em dia"
                  : ("Suspenso" as StudentStatus),
            }
          : row,
      ),
    );
    setToast("Situação de acesso atualizada.");
    setSelected(null);
  }
  return (
    <Shell profile="professional">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          kicker="FINANCEIRO"
          title="Mensalidades sem planilha."
          text="Controle vencimentos, pendências e acesso em um só lugar."
        />
        <Button
          onClick={() => setToast("Cobrança criada para o próximo ciclo.")}
        >
          <Plus size={17} /> Nova cobrança
        </Button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="PREVISTO EM AGOSTO"
          value="R$ 7.640"
          detail="38 mensalidades"
          icon={CircleDollarSign}
        />
        <Metric
          label="RECEBIDO"
          value="R$ 7.032"
          detail="92% do previsto"
          icon={CheckCircle2}
        />
        <Metric
          label="A VENCER"
          value="R$ 408"
          detail="3 nos próximos 7 dias"
          icon={CalendarDays}
          warning
        />
        <Metric
          label="EM ATRASO"
          value="R$ 200"
          detail="1 acesso suspenso"
          icon={AlertCircle}
          warning
        />
      </div>
      <section className={`${card} mt-6 overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2ef] p-5">
          <div className="flex gap-2">
            {[
              ["all", "Todas"],
              ["pending", "Pendentes"],
              ["overdue", "Atrasadas"],
              ["paid", "Pagas"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTab(value as typeof tab)}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${tab === value ? "bg-[#173f34] text-white" : "bg-[#f2f7f4] text-[#52665e]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#71837b]">
            Bloqueio automático após 3 dias de atraso
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {filtered.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.5fr_.8fr_.8fr_.8fr_auto] items-center gap-4 border-b border-[#edf2ef] px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={row.name} />
                  <span>
                    <b className="block text-sm">{row.name}</b>
                    <span className="text-xs text-[#71837b]">
                      R$ 200,00 / mês
                    </span>
                  </span>
                </div>
                <span className="text-sm">
                  <b className="block">{row.due}</b>
                  <span className="text-xs text-[#71837b]">Vencimento</span>
                </span>
                <StatusBadge status={row.payment} />
                <StatusBadge status={row.status} />
                <div className="relative">
                  <button
                    aria-label={`Ações de ${row.name}`}
                    onClick={() =>
                      setSelected(selected === row.id ? null : row.id)
                    }
                    className="grid h-10 w-10 place-items-center rounded-xl border border-[#dbe7e0] hover:bg-[#f4f8f6]"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  <AnimatePresence>
                    {selected === row.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-[#dbe7e0] bg-white p-2 shadow-xl"
                      >
                        <button
                          onClick={() => paid(row.id)}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-[#f1f7f4]"
                        >
                          Confirmar pagamento
                        </button>
                        <button
                          onClick={() => suspend(row.id)}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-[#f1f7f4]"
                        >
                          {row.status === "Suspenso"
                            ? "Liberar acesso"
                            : "Suspender acesso"}
                        </button>
                        <button
                          onClick={() => {
                            setToast("Lembrete de cobrança enviado.");
                            setSelected(null);
                          }}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-[#f1f7f4]"
                        >
                          Enviar lembrete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </Shell>
  );
}

const studentTabs = [
  "Resumo",
  "Dieta",
  "Treino",
  "Cardio",
  "Check-ins",
  "Evolução",
  "Observações",
];

export function Student360Page({ slug = "lucas-martins" }: { slug?: string }) {
  const router = useRouter();
  const person = people.find((item) => item.id === slug) ?? people[0];
  const [tab, setTab] = useState("Resumo");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([
    "Priorizar sono nesta semana e revisar volume de treino.",
  ]);
  return (
    <Shell profile="professional">
      <button
        onClick={() => router.push("/profissional/alunos")}
        className="mb-5 flex items-center gap-2 text-sm font-bold text-[#52665e]"
      >
        <ArrowLeft size={17} /> Voltar para alunos
      </button>
      <section className={`${card} overflow-hidden`}>
        <div className="bg-[#173f34] p-5 text-white md:p-7">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={person.name} className="h-16 w-16 text-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">{person.name}</h1>
                <StatusBadge status={person.status} />
              </div>
              <p className="mt-1 text-sm text-emerald-100">
                {person.goal} · acompanhamento desde 10 mar 2026
              </p>
            </div>
            <Button
              kind="soft"
              onClick={() => router.push("/profissional/chat")}
            >
              <Send size={16} /> Enviar mensagem
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Peso atual", person.weight],
              ["Aderência", `${person.adherence}%`],
              ["Último acesso", person.last],
              ["Próximo vencimento", person.due],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/10 p-3">
                <p className="text-[10px] font-bold tracking-wide text-emerald-200">
                  {label.toUpperCase()}
                </p>
                <p className="mt-1 font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto border-b border-[#edf2ef] px-3">
          <div className="flex min-w-max">
            {studentTabs.map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`border-b-2 px-4 py-4 text-sm font-bold ${tab === item ? "border-[#087a50] text-[#087a50]" : "border-transparent text-[#71837b]"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 md:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              {tab === "Resumo" && (
                <StudentSummary person={person} onTab={setTab} />
              )}
              {tab === "Dieta" && <PlanSummary kind="diet" />}
              {tab === "Treino" && <PlanSummary kind="workout" />}
              {tab === "Cardio" && <CardioPrescription compact />}
              {tab === "Check-ins" && <CheckinComparison />}
              {tab === "Evolução" && <PhotoComparison />}
              {tab === "Observações" && (
                <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
                  <div>
                    <h2 className="text-lg font-bold">
                      Histórico de orientações
                    </h2>
                    <div className="mt-4 space-y-3">
                      {notes.map((item, index) => (
                        <article
                          key={`${item}-${index}`}
                          className="rounded-2xl bg-[#f5f9f7] p-4"
                        >
                          <p className="text-sm text-[#36574e]">{item}</p>
                          <p className="mt-2 text-xs text-[#81928b]">
                            Camila · hoje, 09:20 · privado
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (note.trim()) {
                        setNotes((value) => [note.trim(), ...value]);
                        setNote("");
                      }
                    }}
                  >
                    <label className="text-sm font-bold">
                      Nova observação
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Registre uma decisão clínica ou orientação..."
                        className={`${field} min-h-32`}
                      />
                    </label>
                    <Button className="mt-3 w-full">Salvar observação</Button>
                  </form>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </Shell>
  );
}

function StudentSummary({
  person,
  onTab,
}: {
  person: (typeof people)[number];
  onTab: (tab: string) => void;
}) {
  const actions = [
    ["Revisar check-in", "Recebido há 2 horas", "Check-ins", HeartPulse],
    [
      "Mensalidade",
      person.payment === "overdue" ? "Pagamento atrasado" : "Vence em breve",
      "Resumo",
      CircleDollarSign,
    ],
    [
      "Baixa aderência",
      `${person.adherence}% nos últimos 7 dias`,
      "Cardio",
      TrendingDown,
    ],
  ] as const;
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div>
        <h2 className="text-lg font-bold">Plano atual</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            [Apple, "Dieta", "1.770 kcal", "4 refeições"],
            [Dumbbell, "Treino", "Inferiores A/B", "4x por semana"],
            [HeartPulse, "Cardio", "Zona 2", "3x · 30 min"],
          ].map(([Icon, title, value, detail]) => (
            <button
              key={String(title)}
              onClick={() => onTab(String(title))}
              className="rounded-2xl border border-[#e7eeea] p-4 text-left transition hover:border-[#99c9ac] hover:bg-[#fbfdfc]"
            >
              <Icon size={19} className="text-[#087a50]" />
              <b className="mt-4 block text-sm">{title as string}</b>
              <span className="mt-1 block font-bold">{value as string}</span>
              <span className="text-xs text-[#71837b]">{detail as string}</span>
            </button>
          ))}
        </div>
        <h2 className="mt-7 text-lg font-bold">Aderência da semana</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Dieta", "86%"],
            ["Treino", "75%"],
            ["Cardio", "67%"],
            ["Hábitos", "91%"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-[#f5f9f7] p-4">
              <p className="text-xs text-[#71837b]">{label}</p>
              <p className="mt-1 text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold">Precisa de atenção</h2>
        <div className="mt-4 space-y-2">
          {actions.map(([title, text, tab, Icon]) => (
            <button
              key={title}
              onClick={() => onTab(tab)}
              className="flex w-full items-center gap-3 rounded-2xl bg-[#fffaf0] p-4 text-left"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0c7] text-[#9a6800]">
                <Icon size={17} />
              </span>
              <span>
                <b className="block text-sm">{title}</b>
                <span className="text-xs text-[#786d52]">{text}</span>
              </span>
              <ChevronRight size={16} className="ml-auto text-[#a89973]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanSummary({ kind }: { kind: "diet" | "workout" }) {
  const [toast, setToast] = useState("");
  const [showMacros, setShowMacros] = useState(true);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {kind === "diet" ? "Plano alimentar atual" : "Treino atual"}
          </h2>
          <p className="mt-1 text-sm text-[#71837b]">
            Publicado em 04 ago 2026 · versão 3
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {kind === "diet" && (
            <Button
              kind="outline"
              onClick={() => setShowMacros((value) => !value)}
            >
              {showMacros
                ? "Ocultar macros do aluno"
                : "Mostrar macros ao aluno"}
            </Button>
          )}
          <Button
            kind="outline"
            onClick={() => setToast("Protocolo duplicado como rascunho.")}
          >
            <Copy size={16} /> Duplicar
          </Button>
          <Button onClick={() => setToast("Editor aberto na demonstração.")}>
            Editar plano
          </Button>
        </div>
      </div>
      {kind === "diet" ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            ["Café da manhã", "390 kcal", "P 28g · C 42g · G 12g"],
            ["Almoço", "610 kcal", "P 46g · C 65g · G 18g"],
            ["Lanche", "280 kcal", "P 20g · C 36g · G 7g"],
            ["Jantar", "490 kcal", "P 42g · C 48g · G 14g"],
          ].map((item) => (
            <div
              key={item[0]}
              className="rounded-2xl border border-[#e7eeea] p-4"
            >
              <div className="flex justify-between">
                <b>{item[0]}</b>
                {showMacros && (
                  <span className="text-sm font-bold text-[#087a50]">
                    {item[1]}
                  </span>
                )}
              </div>
              {showMacros && (
                <p className="mt-2 text-sm text-[#71837b]">{item[2]}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {[
            ["Agachamento livre", "4 × 8", "RIR 2", "90 s"],
            ["Levantamento terra romeno", "3 × 10", "RPE 8", "90 s"],
            ["Cadeira flexora", "3 × 12", "Drop-set", "60 s"],
          ].map((item) => (
            <div
              key={item[0]}
              className="grid gap-2 rounded-2xl border border-[#e7eeea] p-4 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <b>{item[0]}</b>
              {item.slice(1).map((value) => (
                <span key={value} className="text-sm text-[#52665e]">
                  {value}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </>
  );
}

export function TemplatesPage() {
  const [kind, setKind] = useState<"Treinos" | "Dietas">("Treinos");
  const [toast, setToast] = useState("");
  const templates =
    kind === "Treinos"
      ? [
          ["Hipertrofia — inferiores", "8 exercícios", "Usado 14 vezes"],
          ["Full body — iniciante", "6 exercícios", "Usado 9 vezes"],
          ["Força — upper/lower", "10 exercícios", "Usado 6 vezes"],
        ]
      : [
          [
            "Redução de gordura — base",
            "4 refeições · 1.780 kcal",
            "Usado 18 vezes",
          ],
          [
            "Superávit controlado",
            "5 refeições · 2.450 kcal",
            "Usado 11 vezes",
          ],
          ["Rotina corrida", "4 refeições práticas", "Usado 7 vezes"],
        ];
  return (
    <Shell profile="professional">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          kicker="MODELOS"
          title="Crie uma vez. Personalize sempre."
          text="Reaproveite estruturas seguras sem perder a individualização."
        />
        <Button
          onClick={() =>
            setToast(`Novo modelo de ${kind.toLowerCase()} criado.`)
          }
        >
          <Plus size={17} /> Novo modelo
        </Button>
      </div>
      <div className="mt-6 inline-flex rounded-xl bg-[#eaf2ed] p-1">
        {["Treinos", "Dietas"].map((item) => (
          <button
            key={item}
            onClick={() => setKind(item as typeof kind)}
            className={`rounded-lg px-5 py-2.5 text-sm font-bold ${kind === item ? "bg-white text-[#173f34] shadow-sm" : "text-[#61756d]"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map(([title, detail, used], index) => (
          <motion.article
            whileHover={{ y: -2 }}
            key={title}
            className={`${card} p-5`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]">
              {kind === "Treinos" ? (
                <Dumbbell size={20} />
              ) : (
                <Apple size={20} />
              )}
            </span>
            <h2 className="mt-5 font-bold">{title}</h2>
            <p className="mt-1 text-sm text-[#52665e]">{detail}</p>
            <p className="mt-3 text-xs text-[#91a39b]">
              {used} · atualizado há {index + 1} dias
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                kind="soft"
                className="flex-1 py-2.5"
                onClick={() =>
                  setToast(
                    "Modelo duplicado para Lucas e aberto para personalização.",
                  )
                }
              >
                <Copy size={15} /> Aplicar a aluno
              </Button>
              <Button
                kind="outline"
                className="px-3 py-2.5"
                onClick={() => setToast("Editor do modelo aberto.")}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </motion.article>
        ))}
      </div>
      <section className="mt-6 rounded-3xl bg-[#173f34] p-6 text-white">
        <Sparkles className="text-[#b8e986]" />
        <h2 className="mt-4 text-xl font-bold">Duplicar de outro aluno</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-100">
          Escolha um protocolo já publicado, crie uma cópia desvinculada e
          ajuste apenas o necessário antes de publicar.
        </p>
        <Button
          kind="soft"
          className="mt-5"
          onClick={() => setToast("Seletor de alunos aberto.")}
        >
          Escolher protocolo
        </Button>
      </section>
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </Shell>
  );
}

export function CardioPage() {
  const [done, setDone] = useState([true, false, false]);
  const [toast, setToast] = useState("");
  return (
    <Shell profile="student">
      <PageTitle
        kicker="CARDIO"
        title="Seu condicionamento, com direção."
        text="Zona 2 · bicicleta ou caminhada inclinada · 3 vezes por semana."
      />
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className={`${card} p-5 md:p-6`}>
          <CardioPrescription />
          <div className="mt-6 space-y-3">
            {["Terça, 6 ago", "Quinta, 8 ago", "Sábado, 10 ago"].map(
              (date, index) => (
                <button
                  key={date}
                  onClick={() => {
                    setDone((value) =>
                      value.map((item, itemIndex) =>
                        itemIndex === index ? !item : item,
                      ),
                    );
                    if (!done[index])
                      setToast("Cardio registrado. Boa consistência!");
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${done[index] ? "border-[#bfe4cd] bg-[#f4fbf7]" : "border-[#e2ece6]"}`}
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${done[index] ? "bg-[#087a50] text-white" : "bg-[#edf3ef] text-[#71837b]"}`}
                  >
                    {done[index] ? <Check size={17} /> : index + 1}
                  </span>
                  <span>
                    <b className="block text-sm">{date}</b>
                    <span className="text-xs text-[#71837b]">
                      30 minutos · intensidade moderada
                    </span>
                  </span>
                  <span className="ml-auto text-xs font-bold text-[#087a50]">
                    {done[index] ? "Realizado" : "Marcar"}
                  </span>
                </button>
              ),
            )}
          </div>
        </section>
        <section className="rounded-3xl bg-[#173f34] p-6 text-white">
          <HeartPulse size={24} className="text-[#b8e986]" />
          <p className="mt-5 text-xs font-bold tracking-[.14em] text-[#b8e986]">
            ORIENTAÇÃO
          </p>
          <h2 className="mt-2 text-2xl font-bold">Ritmo sustentável.</h2>
          <p className="mt-3 text-sm leading-relaxed text-emerald-100">
            Mantenha uma intensidade em que ainda consiga falar frases curtas.
            Se sentir tontura ou dor, interrompa e avise sua profissional.
          </p>
          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <p className="text-xs text-emerald-200">ADERÊNCIA DO CICLO</p>
            <p className="mt-1 text-3xl font-bold">67%</p>
            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div className="h-full w-2/3 rounded-full bg-[#b8e986]" />
            </div>
          </div>
        </section>
      </div>
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </Shell>
  );
}

function CardioPrescription({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-[.12em] text-[#087a50]">
            PRESCRIÇÃO ATUAL
          </p>
          <h2 className="mt-1 text-xl font-bold">Base aeróbica · Zona 2</h2>
        </div>
        <StatusBadge status="Em dia" />
      </div>
      <div
        className={`mt-5 grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}
      >
        {[
          [Clock3, "Duração", "30 min"],
          [CalendarDays, "Frequência", "3x/sem"],
          [Activity, "Intensidade", "Moderada"],
          [HeartPulse, "Referência", "125–145 bpm"],
        ].map(([Icon, label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-[#f5f9f7] p-3">
            <Icon size={16} className="text-[#087a50]" />
            <p className="mt-3 text-[10px] font-bold text-[#71837b]">
              {label as string}
            </p>
            <p className="mt-1 text-sm font-bold">{value as string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HabitsPage() {
  const initial = [true, true, false, true, false];
  const [done, setDone] = useState(initial);
  const habits = [
    [GlassWater, "Água", "2,5 litros"],
    [Footprints, "Passos", "8.000 passos"],
    [Moon, "Sono", "7h30 por noite"],
    [HeartPulse, "Cardio", "30 minutos"],
    [Sparkles, "Suplementação", "Creatina · 5 g"],
  ] as const;
  const percent = Math.round((done.filter(Boolean).length / done.length) * 100);
  return (
    <Shell profile="student">
      <PageTitle
        kicker="HÁBITOS & ORIENTAÇÕES"
        title="O básico bem feito, todos os dias."
        text="Metas definidas pela sua profissional para apoiar o plano."
      />
      <section className="mt-6 rounded-3xl bg-[#087a50] p-6 text-white">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold tracking-[.12em] text-[#b8e986]">
              PROGRESSO DE HOJE
            </p>
            <p className="mt-2 text-3xl font-bold">{percent}% concluído</p>
          </div>
          <b className="text-lg">
            {done.filter(Boolean).length}/{done.length}
          </b>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
          <motion.div
            animate={{ width: `${percent}%` }}
            className="h-full rounded-full bg-[#b8e986]"
          />
        </div>
      </section>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {habits.map(([Icon, title, target], index) => (
          <button
            key={title}
            onClick={() =>
              setDone((value) =>
                value.map((item, itemIndex) =>
                  itemIndex === index ? !item : item,
                ),
              )
            }
            className={`${card} flex items-center gap-4 p-5 text-left ${done[index] ? "border-[#bfe4cd]" : ""}`}
          >
            <span
              className={`grid h-12 w-12 place-items-center rounded-2xl ${done[index] ? "bg-[#087a50] text-white" : "bg-[#e7f4ec] text-[#087a50]"}`}
            >
              {done[index] ? <Check size={20} /> : <Icon size={20} />}
            </span>
            <span className="flex-1">
              <b className="block">{title}</b>
              <span className="mt-1 block text-sm text-[#71837b]">
                Meta: {target}
              </span>
            </span>
            <span
              className={`text-xs font-bold ${done[index] ? "text-[#087a50]" : "text-[#91a39b]"}`}
            >
              {done[index] ? "Concluído" : "Marcar"}
            </span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

export function AdvancedWorkoutPage() {
  const [started, setStarted] = useState(false);
  const [sets, setSets] = useState<
    Record<number, { load: string; reps: string; rir: string }>
  >({});
  const [rest, setRest] = useState(0);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!rest) return;
    const timer = window.setInterval(
      () => setRest((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [rest]);
  const exercises = [
    ["Agachamento livre", "4 × 8", "RIR 2", "90", "Última vez: 72 kg × 8"],
    ["Terra romeno", "3 × 10", "RPE 8", "90", "Última vez: 64 kg × 10"],
    [
      "Cadeira flexora",
      "3 × 12",
      "Drop-set na última",
      "60",
      "Última vez: 42 kg × 12",
    ],
  ];
  function complete(index: number, seconds: number) {
    setSets((value) => ({
      ...value,
      [index]: value[index] ?? { load: "", reps: "", rir: "" },
    }));
    setRest(seconds);
    setToast(`${exercises[index][0]} registrado. Descanso iniciado.`);
  }
  return (
    <Shell profile="student">
      <PageTitle
        kicker="TREINO"
        title="Inferiores A"
        text="Força e controle · 3 exercícios · aproximadamente 45 minutos."
      />
      {!started ? (
        <section className="mt-6 rounded-3xl bg-[#173f34] p-7 text-white md:flex md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[.14em] text-[#b8e986]">
              TREINO DE HOJE
            </p>
            <h2 className="mt-2 text-3xl font-bold">Posterior & glúteos</h2>
            <p className="mt-2 text-sm text-emerald-100">
              Suas cargas anteriores já estão prontas para consulta.
            </p>
          </div>
          <Button
            onClick={() => setStarted(true)}
            className="mt-5 bg-[#b8e986] text-[#173f34] hover:bg-[#c6f39a] md:mt-0"
          >
            <Play size={17} fill="currentColor" /> Iniciar treino
          </Button>
        </section>
      ) : (
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#e7f4ec] p-4">
          <div>
            <p className="text-xs font-bold text-[#087a50]">
              TREINO EM ANDAMENTO
            </p>
            <p className="mt-1 font-bold">Registre série por série</p>
          </div>
          <Button
            kind="outline"
            onClick={() => {
              setStarted(false);
              setToast("Treino finalizado e salvo no histórico.");
            }}
          >
            Finalizar treino
          </Button>
        </div>
      )}
      <div className="mt-5 space-y-4">
        {exercises.map((exercise, index) => (
          <article key={exercise[0]} className={`${card} overflow-hidden`}>
            <div className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e7f4ec] text-[#087a50]">
                <Dumbbell size={22} />
              </span>
              <div>
                <p className="text-xs font-bold text-[#087a50]">
                  EXERCÍCIO {index + 1}
                </p>
                <h2 className="mt-1 text-lg font-bold">{exercise[0]}</h2>
                <p className="mt-1 text-sm text-[#71837b]">
                  {exercise[1]} · {exercise[2]} · descanso {exercise[3]}s
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#52665e]">
                  <History size={14} /> {exercise[4]}
                </p>
              </div>
              {started && (
                <Button
                  onClick={() => complete(index, Number(exercise[3]))}
                  disabled={Boolean(sets[index])}
                >
                  {sets[index] ? (
                    <>
                      <Check size={16} /> Registrado
                    </>
                  ) : (
                    "Concluir série"
                  )}
                </Button>
              )}
            </div>
            {started && (
              <div className="grid gap-3 border-t border-[#edf2ef] bg-[#fbfdfc] p-4 sm:grid-cols-3">
                <label className="text-xs font-bold text-[#52665e]">
                  Carga (kg)
                  <input
                    inputMode="decimal"
                    value={sets[index]?.load ?? ""}
                    onChange={(event) =>
                      setSets((value) => ({
                        ...value,
                        [index]: {
                          load: event.target.value,
                          reps: value[index]?.reps ?? "",
                          rir: value[index]?.rir ?? "",
                        },
                      }))
                    }
                    placeholder="Ex.: 72"
                    className={field}
                  />
                </label>
                <label className="text-xs font-bold text-[#52665e]">
                  Repetições
                  <input
                    inputMode="numeric"
                    value={sets[index]?.reps ?? ""}
                    onChange={(event) =>
                      setSets((value) => ({
                        ...value,
                        [index]: {
                          load: value[index]?.load ?? "",
                          reps: event.target.value,
                          rir: value[index]?.rir ?? "",
                        },
                      }))
                    }
                    placeholder="Ex.: 8"
                    className={field}
                  />
                </label>
                <label className="text-xs font-bold text-[#52665e]">
                  RIR / RPE
                  <input
                    value={sets[index]?.rir ?? ""}
                    onChange={(event) =>
                      setSets((value) => ({
                        ...value,
                        [index]: {
                          load: value[index]?.load ?? "",
                          reps: value[index]?.reps ?? "",
                          rir: event.target.value,
                        },
                      }))
                    }
                    placeholder="Ex.: RIR 2"
                    className={field}
                  />
                </label>
                <label className="text-xs font-bold text-[#52665e] sm:col-span-3">
                  Observações da série
                  <input
                    placeholder="Ex.: amplitude boa, desconforto leve, ajustar carga..."
                    className={field}
                  />
                </label>
              </div>
            )}
          </article>
        ))}
      </div>
      <AnimatePresence>
        {rest > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-20 right-4 z-40 rounded-2xl bg-[#173f34] p-4 text-white shadow-xl lg:bottom-6 lg:right-6"
          >
            <div className="flex items-center gap-3">
              <TimerReset className="text-[#b8e986]" />
              <div>
                <p className="text-[10px] font-bold text-emerald-200">
                  DESCANSO
                </p>
                <p className="text-2xl font-bold">
                  {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
                </p>
              </div>
              <button
                onClick={() => setRest(0)}
                className="ml-3 rounded-xl bg-white/10 p-2"
              >
                <Pause size={17} />
              </button>
            </div>
          </motion.div>
        )}
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </Shell>
  );
}

export function AdvancedDietPage() {
  const visible = true;
  const [swap, setSwap] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const meals = [
    [
      "Café da manhã",
      "07:00",
      "390",
      "28",
      "42",
      "12",
      ["2 ovos mexidos", "1 fatia de pão integral", "1 banana"],
    ],
    [
      "Almoço",
      "12:30",
      "610",
      "46",
      "65",
      "18",
      ["120 g frango", "100 g arroz integral", "Salada à vontade"],
    ],
    [
      "Lanche",
      "16:30",
      "280",
      "20",
      "36",
      "7",
      ["Iogurte natural", "30 g aveia", "Morangos"],
    ],
    [
      "Jantar",
      "20:00",
      "490",
      "42",
      "48",
      "14",
      ["120 g peixe", "150 g batata-doce", "Legumes"],
    ],
  ] as const;
  return (
    <Shell profile="student">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle
          kicker="NUTRIÇÃO"
          title="Sua dieta de hoje"
          text="Planejamento flexível, com equivalências aprovadas."
        />
        <span className="rounded-xl border border-[#dbe7e0] bg-white px-3 py-2 text-xs font-bold text-[#52665e]">
          Macros visíveis pela profissional
        </span>
      </div>
      {visible && (
        <section className="mt-6 grid grid-cols-2 gap-3 rounded-3xl bg-[#173f34] p-5 text-white sm:grid-cols-4">
          {[
            ["Calorias", "1.770 kcal"],
            ["Proteínas", "136 g"],
            ["Carboidratos", "191 g"],
            ["Gorduras", "51 g"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-emerald-200">
                {label.toUpperCase()}
              </p>
              <p className="mt-1 text-lg font-bold">{value}</p>
            </div>
          ))}
        </section>
      )}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {meals.map((meal) => (
          <article key={meal[0]} className={`${card} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-[#087a50]">{meal[1]}</p>
                <h2 className="mt-1 text-xl font-bold">{meal[0]}</h2>
              </div>
              <b className="text-sm text-[#087a50]">{meal[2]} kcal</b>
            </div>
            {visible && (
              <p className="mt-3 text-xs font-semibold text-[#71837b]">
                P {meal[3]}g · C {meal[4]}g · G {meal[5]}g
              </p>
            )}
            <div className="mt-4 divide-y divide-[#edf2ef]">
              {meal[6].map((item) => (
                <div key={item} className="flex items-center gap-2 py-3">
                  <Check size={15} className="text-[#48ae82]" />
                  <span className="flex-1 text-sm text-[#52665e]">{item}</span>
                  <button
                    onClick={() => setSwap(item)}
                    className="text-xs font-bold text-[#087a50]"
                  >
                    Trocar
                  </button>
                </div>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => setToast(`${meal[0]} concluído.`)}
            >
              Concluir refeição
            </Button>
          </article>
        ))}
      </div>
      <AnimatePresence>
        {swap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-end bg-[#173f34]/30 sm:place-items-center"
            onClick={() => setSwap(null)}
          >
            <motion.section
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full rounded-t-3xl bg-white p-6 sm:max-w-md sm:rounded-3xl"
            >
              <h2 className="text-lg font-bold">Substituir {swap}</h2>
              <p className="mt-1 text-sm text-[#71837b]">
                Opções equivalentes cadastradas pela profissional.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  ["80 g de batata-doce", "−6 kcal · C −1g"],
                  ["40 g de aveia", "+4 kcal · P +1g"],
                  ["Tapioca de 50 g", "+2 kcal · C +1g"],
                ].map(([item, delta]) => (
                  <button
                    key={item}
                    onClick={() => {
                      setSwap(null);
                      setToast(`Substituição aplicada: ${item}.`);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#dbe7e0] p-4 text-left"
                  >
                    <span>
                      <b className="block text-sm">{item}</b>
                      <span className="text-xs text-[#71837b]">{delta}</span>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
              <Button
                kind="outline"
                onClick={() => setSwap(null)}
                className="mt-4 w-full"
              >
                Cancelar
              </Button>
            </motion.section>
          </motion.div>
        )}
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </Shell>
  );
}

export function AdvancedCheckinPage() {
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({
    Sono: 4,
    Fome: 3,
    Disposição: 4,
    Treino: 4,
    Digestão: 5,
    Intestino: 4,
  });
  const sections = ["Corpo", "Bem-estar", "Aderência", "Fotos e relato"];
  if (sent)
    return (
      <Shell profile="student">
        <div className="mx-auto mt-20 max-w-md rounded-3xl bg-white p-8 text-center soft-shadow">
          <CheckCircle2 size={50} className="mx-auto text-[#087a50]" />
          <h1 className="mt-5 text-2xl font-bold">Check-in enviado</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#71837b]">
            Camila recebeu seus dados, medidas e relato. O histórico ficará
            disponível junto ao feedback.
          </p>
        </div>
      </Shell>
    );
  return (
    <Shell profile="student">
      <PageTitle
        kicker="CHECK-IN COMPLETO"
        title="Como foi sua semana?"
        text="Responda com calma. Leva cerca de 4 minutos."
      />
      <section className={`${card} mt-6 max-w-3xl p-5 md:p-7`}>
        <div className="flex gap-2">
          {sections.map((section, index) => (
            <div key={section} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${index <= step ? "bg-[#087a50]" : "bg-[#e6eee9]"}`}
              />
              <p className="mt-2 hidden text-[10px] font-bold text-[#71837b] sm:block">
                {section}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-7">
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold">Peso e medidas</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Peso atual (kg)
                  <input
                    inputMode="decimal"
                    placeholder="86,4"
                    className={field}
                  />
                </label>
                <label className="text-sm font-bold">
                  Cintura (cm)
                  <input
                    inputMode="decimal"
                    placeholder="82"
                    className={field}
                  />
                </label>
                <label className="text-sm font-bold">
                  Abdômen (cm)
                  <input
                    inputMode="decimal"
                    placeholder="88"
                    className={field}
                  />
                </label>
                <label className="text-sm font-bold">
                  Quadril (cm)
                  <input
                    inputMode="decimal"
                    placeholder="101"
                    className={field}
                  />
                </label>
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold">
                Bem-estar e resposta ao plano
              </h2>
              <div className="mt-5 space-y-5">
                {Object.keys(scores).map((label) => (
                  <div key={label}>
                    <div className="flex justify-between">
                      <b className="text-sm">{label}</b>
                      <span className="text-xs text-[#71837b]">
                        {scores[label]}/5
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() =>
                            setScores((current) => ({
                              ...current,
                              [label]: value,
                            }))
                          }
                          className={`rounded-xl border py-3 text-sm font-bold ${scores[label] === value ? "border-[#087a50] bg-[#eff9f3] text-[#087a50]" : "border-[#dbe7e0]"}`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold">Aderência</h2>
              <div className="mt-5 space-y-6">
                {[
                  ["Dieta", 86],
                  ["Treino", 75],
                  ["Cardio", 67],
                ].map(([label, initial]) => (
                  <label
                    key={String(label)}
                    className="block text-sm font-bold"
                  >
                    <span className="flex justify-between">
                      <span>{label}</span>
                      <span>{initial}%</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue={initial}
                      className="mt-3 w-full accent-[#087a50]"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold">Fotos e relato livre</h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {["Frente", "Lateral", "Costas"].map((label) => (
                  <label
                    key={label}
                    className="grid aspect-[3/4] cursor-pointer place-items-center rounded-2xl border border-dashed border-[#b8ccc1] bg-[#f8fbf9] text-center"
                  >
                    <span>
                      <Camera className="mx-auto text-[#087a50]" />
                      <b className="mt-2 block text-xs">{label}</b>
                      <span className="text-[10px] text-[#71837b]">
                        Adicionar foto
                      </span>
                    </span>
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                ))}
              </div>
              <label className="mt-5 block text-sm font-bold">
                Como você se sentiu?
                <textarea
                  className={`${field} min-h-28`}
                  placeholder="Conte dificuldades, conquistas ou dúvidas..."
                />
              </label>
            </div>
          )}
        </div>
        <div className="mt-8 flex justify-between">
          <Button
            kind="outline"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            Voltar
          </Button>
          <Button
            onClick={() =>
              step === sections.length - 1
                ? setSent(true)
                : setStep((value) => value + 1)
            }
          >
            {step === sections.length - 1 ? "Enviar check-in" : "Continuar"}
            <ChevronRight size={16} />
          </Button>
        </div>
      </section>
    </Shell>
  );
}

export function CheckinReviewPage() {
  const [feedback, setFeedback] = useState("");
  const [history, setHistory] = useState([
    "Mantenha a estratégia atual e aumente o foco no sono.",
  ]);
  return (
    <Shell profile="professional">
      <PageTitle
        kicker="CHECK-INS"
        title="Comparação semanal"
        text="Mudanças relevantes destacadas entre o atual e o anterior."
      />
      <section className={`${card} mt-6 overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[#edf2ef] p-5">
          <Avatar name="Lucas Martins" />
          <div>
            <h2 className="font-bold">Lucas Martins</h2>
            <p className="text-xs text-[#71837b]">
              Check-in atual enviado hoje às 08:42
            </p>
          </div>
          <StatusBadge status="Pendente" />
        </div>
        <div className="grid divide-y divide-[#edf2ef] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <CheckinColumn title="Anterior · 30 jul" current={false} />
          <CheckinColumn title="Atual · 6 ago" current />
        </div>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <div className={`${card} p-5`}>
          <h2 className="font-bold">Mudanças detectadas</h2>
          <div className="mt-4 space-y-2">
            {[
              [TrendingDown, "Peso", "−0,8 kg", "positive"],
              [Moon, "Sono", "−1 ponto", "warning"],
              [Activity, "Aderência ao cardio", "+17%", "positive"],
            ].map(([Icon, label, value, tone]) => (
              <div
                key={String(label)}
                className="flex items-center gap-3 rounded-2xl bg-[#f7faf8] p-3"
              >
                <Icon
                  size={17}
                  className={
                    tone === "warning" ? "text-[#b17600]" : "text-[#087a50]"
                  }
                />
                <b className="text-sm">{label as string}</b>
                <span
                  className={`ml-auto text-sm font-bold ${tone === "warning" ? "text-[#b17600]" : "text-[#087a50]"}`}
                >
                  {value as string}
                </span>
              </div>
            ))}
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (feedback.trim()) {
              setHistory((value) => [feedback.trim(), ...value]);
              setFeedback("");
            }
          }}
          className={`${card} p-5`}
        >
          <h2 className="font-bold">Feedback e orientação</h2>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className={`${field} min-h-28`}
            placeholder="Escreva a orientação para este check-in..."
          />
          <Button className="mt-3 w-full">
            <Send size={16} /> Enviar feedback
          </Button>
          {history.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="mt-4 rounded-2xl bg-[#eaf6ef] p-4 text-sm text-[#285248]"
            >
              <b className="block text-xs text-[#087a50]">HISTÓRICO</b>
              <p className="mt-1">{item}</p>
            </div>
          ))}
        </form>
      </section>
    </Shell>
  );
}

function CheckinColumn({
  title,
  current,
}: {
  title: string;
  current: boolean;
}) {
  const values = current
    ? [
        ["Peso", "86,4 kg", "−0,8 kg"],
        ["Cintura", "82 cm", "−2 cm"],
        ["Sono", "3/5", "−1"],
        ["Fome", "3/5", "="],
        ["Dieta", "86%", "+4%"],
        ["Cardio", "67%", "+17%"],
      ]
    : [
        ["Peso", "87,2 kg", ""],
        ["Cintura", "84 cm", ""],
        ["Sono", "4/5", ""],
        ["Fome", "3/5", ""],
        ["Dieta", "82%", ""],
        ["Cardio", "50%", ""],
      ];
  return (
    <div className={`p-5 ${current ? "bg-[#fbfdfc]" : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{title}</h3>
        {current && (
          <span className="text-xs font-bold text-[#087a50]">Atual</span>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {values.map(([label, value, delta]) => (
          <div
            key={label}
            className="flex items-center rounded-xl border border-[#edf2ef] bg-white p-3"
          >
            <span className="text-sm text-[#71837b]">{label}</span>
            <b className="ml-auto text-sm">{value}</b>
            {delta && (
              <span
                className={`ml-2 text-xs font-bold ${delta.startsWith("−") && label === "Sono" ? "text-[#b17600]" : delta === "=" ? "text-[#91a39b]" : "text-[#087a50]"}`}
              >
                {delta}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["Frente", "Lateral", "Costas"].map((angle) => (
          <div
            key={angle}
            className="aspect-[3/4] rounded-xl bg-gradient-to-b from-[#e4efe9] to-[#b5d0c2] p-2 text-[10px] font-bold text-[#426359]"
          >
            {angle}
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckinComparison() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Check-in atual × anterior</h2>
          <p className="mt-1 text-sm text-[#71837b]">
            Comparação automática das principais respostas.
          </p>
        </div>
        <Button kind="soft">Abrir revisão completa</Button>
      </div>
      <div className="mt-5 grid overflow-hidden rounded-2xl border border-[#e2ece6] md:grid-cols-2">
        <CheckinColumn title="Anterior · 30 jul" current={false} />
        <CheckinColumn title="Atual · 6 ago" current />
      </div>
    </div>
  );
}

function PhotoComparison() {
  const [angle, setAngle] = useState("Frente");
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Comparação de evolução</h2>
          <p className="mt-1 text-sm text-[#71837b]">
            10 mar 2026 × 6 ago 2026
          </p>
        </div>
        <div className="flex gap-2">
          {["Frente", "Lateral", "Costas"].map((item) => (
            <button
              key={item}
              onClick={() => setAngle(item)}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${angle === item ? "bg-[#173f34] text-white" : "bg-[#edf3ef] text-[#52665e]"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="aspect-[3/4] rounded-3xl bg-gradient-to-b from-[#e8f0ec] to-[#a9c7b8] p-4">
          <b className="text-sm">10 mar</b>
          <p className="text-xs text-[#52665e]">{angle} · 92,0 kg</p>
        </div>
        <div className="aspect-[3/4] rounded-3xl bg-gradient-to-b from-[#dff0e5] to-[#71ad8f] p-4">
          <b className="text-sm">6 ago</b>
          <p className="text-xs text-[#315647]">{angle} · 86,4 kg</p>
        </div>
      </div>
    </div>
  );
}
