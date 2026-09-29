import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCob, interMockMode } from "@/lib/server/inter";

export type InvoiceRow = {
  id: string; coach_id: string; plan_id: string; amount_cents: number; txid: string;
  status: "pending" | "paid" | "expired" | "canceled"; pix_copia_e_cola: string | null; expires_at: string; paid_at: string | null;
};

const keys = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishable: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY });
const options = { auth: { persistSession: false, autoRefreshToken: false } };

export function adminClient() {
  const { url, service } = keys();
  return url && service ? createClient(url, service, options) : null;
}

/** Resolves the signed-in user from the "Authorization: Bearer <access token>" header. */
export async function requestUser(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const { url, publishable } = keys();
  if (!token || !url || !publishable) return null;
  const { data } = await createClient(url, publishable, options).auth.getUser(token);
  return data.user;
}

export const publicInvoice = (invoice: InvoiceRow) => ({
  id: invoice.id, planId: invoice.plan_id, amountCents: invoice.amount_cents, status: invoice.status,
  pixCopiaECola: invoice.pix_copia_e_cola, expiresAt: invoice.expires_at, paidAt: invoice.paid_at, mock: interMockMode(),
});

/** Asks the bank for the charge status and settles or expires the invoice. */
export async function refreshInvoice(admin: SupabaseClient, invoice: InvoiceRow): Promise<InvoiceRow> {
  if ((invoice.status !== "pending" && invoice.status !== "expired") || interMockMode()) return invoice;
  const cob = await getCob(invoice.txid);
  if (cob.status === "CONCLUIDA") {
    await admin.rpc("settle_platform_invoice", { target_invoice: invoice.id, paid_e2e: cob.pix?.[0]?.endToEndId ?? null });
  } else if (invoice.status === "pending" && (cob.status !== "ATIVA" || new Date(invoice.expires_at).getTime() < Date.now())) {
    await admin.from("platform_invoices").update({ status: "expired" }).eq("id", invoice.id).eq("status", "pending");
  } else {
    return invoice;
  }
  const { data } = await admin.from("platform_invoices").select("*").eq("id", invoice.id).single<InvoiceRow>();
  return data ?? invoice;
}
