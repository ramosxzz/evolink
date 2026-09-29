import { authEmail } from "@/lib/server/auth-emails";
import { sendEmail } from "@/lib/server/send-email";
import { verifyStandardWebhook } from "@/lib/server/standard-webhook";

// Supabase "Send Email" auth hook: Supabase calls this instead of sending its
// own email, and we send our template through Resend.
type HookPayload = {
  user: { email: string; new_email?: string; user_metadata?: { full_name?: string } };
  email_data: { token?: string; token_hash?: string; redirect_to?: string; email_action_type: string; site_url?: string; token_new?: string; token_hash_new?: string };
};

const failure = (status: number, message: string) => Response.json({ error: { http_code: status, message } }, { status });

export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !supabaseUrl) return failure(500, "Envio de e-mail não configurado.");

  const body = await request.text();
  if (!verifyStandardWebhook(body, request.headers, secret)) return failure(401, "Assinatura inválida.");

  const { user, email_data: data } = JSON.parse(body) as HookPayload;
  const kind = data.email_action_type;
  const site = process.env.PUBLIC_SITE_URL || "https://evolink.solairew.com.br";
  // Recovery opens our page with the token hash; the page verifies it only when
  // the new password is submitted. This works on any device (no PKCE verifier
  // needed) and link scanners that open the email cannot burn the token.
  const link = !data.token_hash
    ? undefined
    : kind === "recovery"
      ? `${site}/redefinir-senha?token_hash=${encodeURIComponent(data.token_hash)}&type=recovery`
      : `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(data.token_hash)}&type=${encodeURIComponent(kind)}&redirect_to=${encodeURIComponent(data.redirect_to || data.site_url || "")}`;
  const email = authEmail({ kind, name: user.user_metadata?.full_name, link: kind === "reauthentication" ? undefined : link, code: data.token });
  const to = kind === "email_change" && user.new_email ? user.new_email : user.email;

  if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) return failure(500, "RESEND_API_KEY não configurada.");
  if (!process.env.RESEND_API_KEY) console.info(`[send-email] ${kind} para ${to}: ${link ?? data.token}`);
  if (!(await sendEmail({ to, ...email }))) return failure(502, "Não foi possível enviar o e-mail.");
  return Response.json({});
}
