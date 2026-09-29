"use client";

import { createClient } from "@/lib/supabase/client";

export type PlatformPlan = { id: string; name: string; description: string; price_cents: number; student_limit: number | null; features: string[] };
export type Subscription = { plan_id: string; status: "active" | "canceled"; current_period_end: string };
export type Invoice = { id: string; planId: string; amountCents: number; status: "pending" | "paid" | "expired" | "canceled"; pixCopiaECola: string | null; expiresAt: string; paidAt: string | null; mock?: boolean };

export const TRIAL_DAYS = 14;
export const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function getBillingOverview(coachId: string) {
  const supabase = createClient();
  const [plans, subscription, invoices, coach, students] = await Promise.all([
    supabase.from("platform_plans").select("id, name, description, price_cents, student_limit, features").order("position"),
    supabase.from("coach_subscriptions").select("plan_id, status, current_period_end").eq("coach_id", coachId).maybeSingle(),
    supabase.from("platform_invoices").select("id, plan_id, amount_cents, status, pix_copia_e_cola, expires_at, paid_at").eq("coach_id", coachId).order("created_at", { ascending: false }).limit(12),
    supabase.from("professional_profiles").select("created_at").eq("id", coachId).maybeSingle(),
    supabase.from("professional_students").select("student_id", { count: "exact", head: true }).eq("professional_id", coachId).eq("status", "active"),
  ]);
  const trialEndsAt = new Date(new Date(coach.data?.created_at ?? Date.now()).getTime() + TRIAL_DAYS * 86_400_000).toISOString();
  return {
    plans: (plans.data ?? []) as PlatformPlan[],
    subscription: subscription.data as Subscription | null,
    invoices: (invoices.data ?? []).map(row => ({ id: row.id, planId: row.plan_id, amountCents: row.amount_cents, status: row.status, pixCopiaECola: row.pix_copia_e_cola, expiresAt: row.expires_at, paidAt: row.paid_at })) as Invoice[],
    trialEndsAt,
    activeStudents: students.count ?? 0,
  };
}

async function api(path: string, init: RequestInit = {}) {
  const { data: { session } } = await createClient().auth.getSession();
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { invoice: null, error: (body.error as string) ?? "Algo deu errado. Tente novamente." };
  return { invoice: body.invoice as Invoice, error: null };
}

export const startCheckout = (planId: string) => api("/api/billing/checkout", { method: "POST", body: JSON.stringify({ planId }) });
export const getInvoiceStatus = (invoiceId: string) => api(`/api/billing/invoices/${invoiceId}`);
export const simulatePayment = (invoiceId: string) => api(`/api/billing/invoices/${invoiceId}/simulate`, { method: "POST" });
