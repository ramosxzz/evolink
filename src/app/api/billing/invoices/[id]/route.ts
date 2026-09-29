import { adminClient, publicInvoice, refreshInvoice, requestUser, type InvoiceRow } from "@/lib/server/billing";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = adminClient();
  const user = await requestUser(request);
  if (!admin || !user) return Response.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });

  const { data: invoice } = await admin.from("platform_invoices").select("*").eq("id", id).eq("coach_id", user.id).maybeSingle<InvoiceRow>();
  if (!invoice) return Response.json({ error: "Cobrança não encontrada." }, { status: 404 });
  try {
    return Response.json({ invoice: publicInvoice(await refreshInvoice(admin, invoice)) });
  } catch (error) {
    console.error("[billing] erro ao consultar cobrança:", error);
    return Response.json({ invoice: publicInvoice(invoice) });
  }
}
