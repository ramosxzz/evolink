import { createHash, timingSafeEqual } from "node:crypto";
import { brandEmail } from "@/lib/server/auth-emails";
import { adminClient } from "@/lib/server/billing";
import { sendEmail } from "@/lib/server/send-email";

// Called once a day by pg_cron. Sends one e-mail when 3 days or less are left
// and one when the period has ended (during the grace days). billing_reminders
// keeps each reminder to a single send per billing period.

const DAY = 86_400_000;
const GRACE_DAYS = 3;
const site = () => process.env.PUBLIC_SITE_URL || "https://evolink.solairew.com.br";
const digest = (value: string) => createHash("sha256").update(value).digest();

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("x-cron-secret");
  return Boolean(secret && given && timingSafeEqual(digest(secret), digest(given)));
}

const plural = (days: number) => `${days} ${days === 1 ? "dia" : "dias"}`;

function reminder(kind: "ending" | "expired", trial: boolean, daysLeft: number) {
  if (kind === "ending") return {
    subject: trial ? `Seu teste do Evolink termina em ${plural(daysLeft)}` : `Sua assinatura do Evolink vence em ${plural(daysLeft)}`,
    title: trial ? "Seu teste grátis está acabando" : "Sua assinatura está perto de vencer",
    text: `Faltam ${plural(daysLeft)}. Renove com Pix em poucos segundos para continuar acompanhando seus alunos sem interrupção. Os dias que ainda restam são somados ao novo período.`,
    button: trial ? "Escolher meu plano" : "Renovar com Pix",
    footnote: "Seus alunos, treinos e dietas continuam salvos em qualquer situação.",
  };
  return {
    subject: "Sua assinatura do Evolink venceu",
    title: "Sua assinatura venceu",
    text: `Você ainda tem ${plural(GRACE_DAYS)} de tolerância para renovar. Depois disso a área do treinador fica bloqueada até o pagamento. Seus alunos continuam acessando normalmente.`,
    button: "Renovar agora",
    footnote: "Se você já pagou, pode ignorar este e-mail: a renovação é confirmada automaticamente.",
  };
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const admin = adminClient();
  if (!admin) return Response.json({ error: "Serviço indisponível." }, { status: 503 });

  const now = Date.now();
  const { data: due } = await admin.from("coach_subscriptions")
    .select("coach_id, status, current_period_end")
    .neq("status", "canceled")
    .gt("current_period_end", new Date(now - GRACE_DAYS * DAY).toISOString())
    .lte("current_period_end", new Date(now + 3 * DAY).toISOString());

  let sent = 0;
  for (const subscription of due ?? []) {
    const periodEnd = new Date(subscription.current_period_end).getTime();
    const kind = periodEnd > now ? "ending" : "expired";
    const { data: claimed } = await admin.from("billing_reminders")
      .upsert({ coach_id: subscription.coach_id, period_end: subscription.current_period_end, kind }, { onConflict: "coach_id,period_end,kind", ignoreDuplicates: true })
      .select("coach_id");
    if (!claimed?.length) continue;

    const [{ data: account }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(subscription.coach_id),
      admin.from("profiles").select("full_name").eq("id", subscription.coach_id).maybeSingle(),
    ]);
    const email = account.user?.email;
    const copy = reminder(kind, subscription.status === "trial", Math.max(1, Math.ceil((periodEnd - now) / DAY)));
    await admin.from("notifications").insert({ recipient_id: subscription.coach_id, kind: "system", title: copy.title, body: copy.text, href: "/profissional/assinatura" });
    if (email && (await sendEmail({ to: email, ...brandEmail({ ...copy, name: profile?.full_name, link: `${site()}/profissional/assinatura` }) }))) sent++;
  }
  return Response.json({ checked: due?.length ?? 0, sent });
}
