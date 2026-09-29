import { adminClient, publicInvoice, requestUser, type InvoiceRow } from "@/lib/server/billing";
import { createCob, ensureWebhook, interConfigured, interMockMode, newTxid } from "@/lib/server/inter";

const CHARGE_SECONDS = 60 * 60;

export async function POST(request: Request) {
  const admin = adminClient();
  if (!admin || (!interConfigured() && !interMockMode())) return Response.json({ error: "Pagamentos ainda não estão disponíveis." }, { status: 503 });

  const user = await requestUser(request);
  if (!user) return Response.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const { planId } = await request.json().catch(() => ({ planId: null }));
  if (typeof planId !== "string") return Response.json({ error: "Escolha um plano." }, { status: 400 });

  const [{ data: coach }, { data: plan }] = await Promise.all([
    admin.from("professional_profiles").select("id").eq("id", user.id).maybeSingle(),
    admin.from("platform_plans").select("id, name, price_cents").eq("id", planId).eq("active", true).maybeSingle(),
  ]);
  if (!coach) return Response.json({ error: "A assinatura é exclusiva para treinadores." }, { status: 403 });
  if (!plan) return Response.json({ error: "Plano não encontrado." }, { status: 404 });

  // Reuse an open charge for the same plan instead of creating a new one on every click.
  const { data: open } = await admin.from("platform_invoices").select("*")
    .eq("coach_id", user.id).eq("plan_id", plan.id).eq("status", "pending")
    .gt("expires_at", new Date(Date.now() + 5 * 60_000).toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle<InvoiceRow>();
  if (open) return Response.json({ invoice: publicInvoice(open) });

  const txid = newTxid();
  try {
    const cob = await createCob({ txid, amountCents: plan.price_cents, expiresInSeconds: CHARGE_SECONDS, description: `Evolink - plano ${plan.name} (30 dias)` });
    const { data: invoice, error } = await admin.from("platform_invoices").insert({
      coach_id: user.id, plan_id: plan.id, amount_cents: plan.price_cents, txid,
      pix_copia_e_cola: cob.pixCopiaECola ?? null, expires_at: new Date(Date.now() + CHARGE_SECONDS * 1000).toISOString(),
    }).select("*").single<InvoiceRow>();
    if (error || !invoice) throw error ?? new Error("Falha ao salvar a cobrança.");
    void ensureWebhook();
    return Response.json({ invoice: publicInvoice(invoice) });
  } catch (error) {
    console.error("[billing] erro ao gerar cobrança:", error);
    return Response.json({ error: "Não foi possível gerar o Pix agora. Tente novamente em instantes." }, { status: 502 });
  }
}
