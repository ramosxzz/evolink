import { adminClient, publicInvoice, requestUser, type InvoiceRow } from "@/lib/server/billing";
import { interMockMode } from "@/lib/server/inter";

// Local development only: marks a fake charge as paid.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!interMockMode()) return Response.json({ error: "Indisponível." }, { status: 404 });
  const { id } = await params;
  const admin = adminClient();
  const user = await requestUser(request);
  if (!admin || !user) return Response.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });

  const { data: owned } = await admin.from("platform_invoices").select("id").eq("id", id).eq("coach_id", user.id).maybeSingle();
  if (!owned) return Response.json({ error: "Cobrança não encontrada." }, { status: 404 });
  await admin.rpc("settle_platform_invoice", { target_invoice: id, paid_e2e: "E00000000MOCK" });
  const { data: invoice } = await admin.from("platform_invoices").select("*").eq("id", id).single<InvoiceRow>();
  return Response.json({ invoice: invoice && publicInvoice(invoice) });
}
