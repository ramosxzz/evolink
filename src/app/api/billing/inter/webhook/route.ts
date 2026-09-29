import { adminClient, refreshInvoice, type InvoiceRow } from "@/lib/server/billing";
import { interConfigured } from "@/lib/server/inter";

// Pix callback from Banco Inter. The body is only a hint: each charge is
// confirmed again with the bank API before the invoice is settled.
export async function POST(request: Request) {
  const admin = adminClient();
  if (!admin || !interConfigured()) return Response.json({}, { status: 503 });

  const body = await request.json().catch(() => null) as { pix?: { txid?: string }[] } | null;
  const txids = [...new Set((body?.pix ?? []).map(item => item.txid).filter((txid): txid is string => typeof txid === "string" && /^[a-zA-Z0-9]{26,35}$/.test(txid)))].slice(0, 50);
  if (!txids.length) return Response.json({});

  const { data: invoices } = await admin.from("platform_invoices").select("*").in("txid", txids).in("status", ["pending", "expired"]).returns<InvoiceRow[]>();
  for (const invoice of invoices ?? []) {
    try {
      await refreshInvoice(admin, invoice);
    } catch (error) {
      console.error(`[billing] webhook: erro ao confirmar ${invoice.txid}:`, error);
      return Response.json({}, { status: 500 });
    }
  }
  return Response.json({});
}
