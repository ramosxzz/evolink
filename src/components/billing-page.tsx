"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CheckCircle2, Clock3, Copy, QrCode, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import QRCode from "qrcode";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { Modal } from "@/components/ui/modal";
import { ProgressBar, Reveal } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { GRACE_DAYS, refreshViewer, type Viewer } from "@/lib/evolink-data";
import { getBillingOverview, getInvoiceStatus, money, simulatePayment, startCheckout, TRIAL_DAYS, type Invoice, type PlatformPlan } from "@/lib/billing-data";

type Overview = Awaited<ReturnType<typeof getBillingOverview>>;

const DAY = 86_400_000;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const invoiceStatus: Record<Invoice["status"], { label: string; tone: string }> = {
  pending: { label: "Aguardando", tone: "bg-[#fff6dc] text-[#8a6100]" },
  paid: { label: "Pago", tone: "bg-[#e7f4ec] text-[#087a50]" },
  expired: { label: "Expirado", tone: "bg-[#f1f4f2] text-[#5f7169]" },
  canceled: { label: "Cancelado", tone: "bg-[#f1f4f2] text-[#5f7169]" },
};

export function BillingPage({ viewer }: { viewer: Viewer }) {
  const coachId = viewer.professionalId ?? viewer.id;
  const [data, setData] = useState<Overview | null>(null);
  const [now] = useState(() => Date.now());
  const [loadingPlan, setLoadingPlan] = useState("");
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const load = useCallback(() => { refreshViewer(); return getBillingOverview(coachId).then(setData); }, [coachId]);
  useEffect(() => {
    let active = true;
    getBillingOverview(coachId).then(result => { if (active) setData(result); });
    return () => { active = false; };
  }, [coachId]);

  async function choose(plan: PlatformPlan) {
    setLoadingPlan(plan.id); setError("");
    const result = await startCheckout(plan.id);
    setLoadingPlan("");
    if (result.error || !result.invoice) return setError(result.error ?? "Não foi possível gerar o Pix.");
    setInvoice(result.invoice);
  }

  const subscription = data?.subscription;
  const periodEnd = subscription && subscription.status !== "canceled" ? new Date(subscription.current_period_end).getTime() : 0;
  const running = periodEnd > now;
  const active = running && subscription?.status === "active";
  const inTrial = running && subscription?.status === "trial";
  const graceLeft = !running && periodEnd ? Math.ceil((periodEnd + GRACE_DAYS * DAY - now) / DAY) : 0;
  const daysLeft = Math.max(0, Math.ceil((periodEnd - now) / DAY));
  const currentPlan = data?.plans.find(plan => plan.id === subscription?.plan_id);

  return (
    <Shell profile="professional">
      <PageTitle title="Assinatura" text="Seu plano do Evolink. Pagamento por Pix, confirmado na hora." />

      {data === null ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-36 rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map(key => <Skeleton key={key} className="h-72 rounded-3xl" />)}</div>
        </div>
      ) : (
        <>
          <Reveal>
            <section className="mt-6 overflow-hidden rounded-3xl bg-[#07352b] p-6 text-white shadow-[var(--card-shadow)] md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#9fe0bf]">{active ? `Plano ${currentPlan?.name ?? ""}` : inTrial ? `Teste grátis do ${currentPlan?.name ?? "Pro"}` : graceLeft > 0 ? "Assinatura vencida" : "Sem plano ativo"}</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                    {active || inTrial ? <>{daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}</> : graceLeft > 0 ? <>Renove em até {graceLeft} {graceLeft === 1 ? "dia" : "dias"}</> : "Escolha um plano para continuar"}
                  </h2>
                  <p className="mt-1 text-sm text-white/70">
                    {active ? `Válido até ${shortDate(subscription!.current_period_end)}. Pague antes para somar mais 30 dias.` : inTrial ? `Seu teste de ${TRIAL_DAYS} dias termina em ${shortDate(subscription!.current_period_end)}. Se assinar antes, os dias restantes são somados.` : graceLeft > 0 ? "Depois disso a área do treinador fica bloqueada até a renovação." : "Seus alunos e dados continuam salvos."}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                  <p className="text-xs text-white/60">Alunos ativos</p>
                  <p className="text-2xl font-bold tabular">{data.activeStudents}{currentPlan?.student_limit ? <span className="text-base font-semibold text-white/50"> / {currentPlan.student_limit}</span> : null}</p>
                </div>
              </div>
              {(active || inTrial) && (
                <div className="mt-5">
                  <ProgressBar value={daysLeft / (active ? 30 : TRIAL_DAYS)} className="bg-[#5fd39b]" track="bg-white/15" />
                </div>
              )}
            </section>
          </Reveal>

          {error && <p role="alert" className="mt-4 rounded-2xl bg-[#fdecec] px-4 py-3 text-sm font-medium text-[#a12c2c]">{error}</p>}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {data.plans.map((plan, index) => {
              const current = active && plan.id === subscription?.plan_id;
              const featured = plan.id === "pro";
              const tooSmall = plan.student_limit !== null && data.activeStudents > plan.student_limit;
              return (
                <Reveal key={plan.id} index={index + 1}>
                  <article className={`relative flex h-full flex-col rounded-3xl bg-white p-6 shadow-[var(--card-shadow)] ${current ? "ring-2 ring-[var(--emerald)]" : featured ? "ring-1 ring-[#bfe3cf]" : ""}`}>
                    {(current || featured) && (
                      <span className={`absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${current ? "bg-[var(--emerald)] text-white" : "bg-[#e7f4ec] text-[#087a50]"}`}>
                        {current ? <><Check size={12} /> Seu plano</> : <><Sparkles size={12} /> Mais escolhido</>}
                      </span>
                    )}
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">{plan.description}</p>
                    <p className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight tabular">{money(plan.price_cents)}</span>
                      <span className="text-sm text-[var(--muted)]">/30 dias</span>
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                      {plan.features.map(feature => (
                        <li key={feature} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[var(--emerald)]" />{feature}</li>
                      ))}
                    </ul>
                    {tooSmall && <p className="mt-4 text-xs font-medium text-[#8a6100]">Você tem mais alunos ativos que o limite deste plano.</p>}
                    <Button
                      className="mt-5 w-full"
                      kind={current || featured ? "primary" : "outline"}
                      loading={loadingPlan === plan.id}
                      disabled={Boolean(loadingPlan) || tooSmall}
                      onClick={() => choose(plan)}
                    >
                      {loadingPlan === plan.id ? "Gerando Pix" : current ? "Renovar com Pix" : "Assinar com Pix"}
                    </Button>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={14} className="text-[var(--emerald)]" /> Cobrança emitida pelo Banco Inter. Sem cartão e sem renovação automática: você paga quando quiser renovar.</p>

          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-bold"><ReceiptText size={18} className="text-[var(--emerald)]" /> Histórico</h2>
            {data.invoices.length === 0 ? (
              <p className="mt-3 rounded-3xl border border-dashed border-[#cfe3d8] bg-white px-6 py-8 text-center text-sm text-[var(--muted)]">Nenhum pagamento ainda.</p>
            ) : (
              <ul className="mt-3 overflow-hidden rounded-3xl bg-white shadow-[var(--card-shadow)]">
                {data.invoices.map(item => {
                  const plan = data.plans.find(p => p.id === item.planId);
                  const status = invoiceStatus[item.status];
                  const reopen = item.status === "pending" && new Date(item.expiresAt).getTime() > now;
                  return (
                    <li key={item.id} className="flex items-center gap-3 border-b border-[#f0f4f2] px-5 py-3.5 last:border-0">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">Plano {plan?.name ?? item.planId}</span>
                        <span className="block text-xs text-[var(--muted)]">{shortDate(item.paidAt ?? item.expiresAt)}</span>
                      </span>
                      <span className="text-sm font-bold tabular">{money(item.amountCents)}</span>
                      {reopen ? (
                        <button onClick={() => setInvoice(item)} className={`rounded-full px-2.5 py-1 text-xs font-bold transition hover:brightness-95 ${status.tone}`}>Ver Pix</button>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.tone}`}>{status.label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <PixModal
        invoice={invoice}
        planName={data?.plans.find(plan => plan.id === invoice?.planId)?.name ?? ""}
        onClose={() => setInvoice(null)}
        onPaid={load}
      />
    </Shell>
  );
}

function PixModal({ invoice, planName, onClose, onPaid }: { invoice: Invoice | null; planName: string; onClose: () => void; onPaid: () => void }) {
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState<Invoice | null>(invoice);
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [remaining, setRemaining] = useState(0);

  if (invoice?.id !== current?.id) { setCurrent(invoice); setSvg(""); setCopied(false); }
  const code = current?.pixCopiaECola ?? "";
  const status = current?.status;

  useEffect(() => {
    if (!code) return;
    let active = true;
    QRCode.toString(code, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#10291f", light: "#ffffff" } }).then(result => { if (active) setSvg(result); });
    return () => { active = false; };
  }, [code]);

  // Polls the bank through our API until the charge is paid or expires.
  useEffect(() => {
    if (!current || status !== "pending") return;
    const id = current.id;
    const timer = window.setInterval(async () => {
      const result = await getInvoiceStatus(id);
      if (result.invoice && result.invoice.status !== "pending") {
        setCurrent(result.invoice);
        if (result.invoice.status === "paid") onPaid();
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [current, status, onPaid]);

  useEffect(() => {
    if (!current || status !== "pending") return;
    const tick = () => setRemaining(Math.max(0, new Date(current.expiresAt).getTime() - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [current, status]);

  async function copy() {
    await navigator.clipboard.writeText(code).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function simulate() {
    if (!current) return;
    setSimulating(true);
    const result = await simulatePayment(current.id);
    setSimulating(false);
    if (result.invoice) { setCurrent(result.invoice); onPaid(); }
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");

  return (
    <Modal open={Boolean(invoice)} onClose={onClose} title={status === "paid" ? "Pagamento confirmado" : `Pix do plano ${planName}`} description={status === "paid" ? undefined : "Abra o app do seu banco e pague com QR Code ou Pix copia e cola."} size="sm">
      <AnimatePresence mode="popLayout" initial={false}>
        {status === "paid" ? (
          <motion.div key="paid" initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
            <motion.span initial={reduceMotion ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.05 }} className="grid size-16 place-items-center rounded-full bg-[#e7f4ec] text-[var(--emerald)]">
              <CheckCircle2 size={36} />
            </motion.span>
            <p className="mt-4 text-lg font-bold">Tudo certo!</p>
            <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">Recebemos {current ? money(current.amountCents) : ""}. Seu plano {planName} foi renovado por 30 dias.</p>
            <Button className="mt-6 w-full" onClick={onClose}>Fechar</Button>
          </motion.div>
        ) : status === "expired" || status === "canceled" || (status === "pending" && remaining === 0 && current) ? (
          <motion.div key="expired" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center">
            <Clock3 className="mx-auto text-[#8a9c94]" size={32} />
            <p className="mt-3 font-bold">Este Pix expirou</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Feche e gere um novo pelo plano escolhido.</p>
            <Button kind="soft" className="mt-6 w-full" onClick={onClose}>Fechar</Button>
          </motion.div>
        ) : (
          <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mx-auto grid aspect-square w-full max-w-[240px] place-items-center rounded-3xl border border-[var(--line)] bg-white p-4">
              {svg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <QrCode className="text-[#cfe3d8]" size={64} />}
            </div>
            <p className="mt-4 text-center text-2xl font-bold tabular">{current ? money(current.amountCents) : ""}</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-[var(--muted)]">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#5fd39b] opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-[var(--emerald)]" /></span>
              Aguardando pagamento · expira em <span className="tabular">{minutes}:{seconds}</span>
            </p>
            <div className="mt-5 rounded-2xl bg-[var(--surface)] p-3">
              <p className="line-clamp-2 break-all font-mono text-xs text-[var(--muted)]">{code}</p>
            </div>
            <Button className="mt-3 w-full" onClick={copy}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={copied ? "ok" : "copy"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-flex items-center gap-2">
                  {copied ? <><Check size={16} /> Código copiado</> : <><Copy size={16} /> Copiar Pix copia e cola</>}
                </motion.span>
              </AnimatePresence>
            </Button>
            {current?.mock && (
              <Button kind="ghost" className="mt-2 w-full" loading={simulating} onClick={simulate}>Simular pagamento (ambiente local)</Button>
            )}
            <p className="mt-3 text-center text-xs text-[var(--muted)]">A confirmação aparece aqui sozinha em poucos segundos.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

