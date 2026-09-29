type AuthEmailKind = "signup" | "recovery" | "magiclink" | "invite" | "email_change" | "reauthentication";

const copy: Record<AuthEmailKind, { subject: string; title: string; text: string; button: string; footnote: string }> = {
  signup: {
    subject: "Confirme seu e-mail no Evolink",
    title: "Confirme seu e-mail",
    text: "Falta só um passo para começar sua evolução no Evolink. Toque no botão abaixo para confirmar seu e-mail e ativar a conta.",
    button: "Confirmar e-mail",
    footnote: "Se você não criou uma conta no Evolink, pode ignorar este e-mail.",
  },
  recovery: {
    subject: "Crie sua nova senha do Evolink",
    title: "Vamos criar uma nova senha",
    text: "Recebemos um pedido para redefinir a senha da sua conta no Evolink. Toque no botão abaixo para escolher uma nova senha.",
    button: "Criar nova senha",
    footnote: "Por segurança, o link vale por pouco tempo e funciona uma única vez. Se você não pediu essa troca, ignore este e-mail: sua senha continua a mesma.",
  },
  magiclink: {
    subject: "Seu link de acesso ao Evolink",
    title: "Entre no Evolink",
    text: "Use o botão abaixo para entrar na sua conta. O link funciona uma única vez.",
    button: "Entrar no Evolink",
    footnote: "Se você não tentou entrar, ignore este e-mail.",
  },
  invite: {
    subject: "Você foi convidado para o Evolink",
    title: "Seu convite chegou",
    text: "Você foi convidado para acompanhar seus treinos, dieta e evolução no Evolink. Toque no botão para criar seu acesso.",
    button: "Aceitar convite",
    footnote: "Se você não esperava este convite, pode ignorar este e-mail.",
  },
  email_change: {
    subject: "Confirme seu novo e-mail no Evolink",
    title: "Confirme a troca de e-mail",
    text: "Recebemos um pedido para trocar o e-mail da sua conta. Confirme pelo botão abaixo para concluir.",
    button: "Confirmar novo e-mail",
    footnote: "Se você não pediu essa troca, entre em contato com a gente.",
  },
  reauthentication: {
    subject: "Seu código de confirmação do Evolink",
    title: "Confirme que é você",
    text: "Use o código abaixo para confirmar a operação no Evolink.",
    button: "",
    footnote: "Se você não fez essa solicitação, ignore este e-mail.",
  },
};

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);

export function authEmail({ kind, name, link, code }: { kind: string; name?: string | null; link?: string; code?: string }) {
  return brandEmail({ ...copy[(kind in copy ? kind : "magiclink") as AuthEmailKind], name, link, code });
}

/** Evolink e-mail layout (green header, one call to action, footer). */
export function brandEmail({ subject, title, text, button, footnote, name, link, code }: { subject: string; title: string; text: string; button: string; footnote: string; name?: string | null; link?: string; code?: string }) {
  const content = { subject, title, text, button, footnote };
  const greeting = name ? `Olá, ${escape(name.split(" ")[0])}!` : "Olá!";
  const action = link && content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:#087a50;"><a href="${escape(link)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${content.button}</a></td></tr></table>
       <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#8a9c94;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="color:#087a50;word-break:break-all;">${escape(link)}</span></p>`
    : code
      ? `<p style="margin:0;font-size:32px;font-weight:bold;letter-spacing:8px;color:#10291f;">${escape(code)}</p>`
      : "";

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#10291f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f5;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;">
          <tr><td style="background:#07352b;padding:28px 32px;">
            <img src="https://evolink.solairew.com.br/brand/evolink-mark-192.png" width="40" height="40" alt="" style="display:inline-block;border-radius:10px;vertical-align:middle;background:#0b5a3f;border:0;">
            <span style="display:inline-block;margin-left:10px;vertical-align:middle;font-size:20px;font-weight:bold;color:#ffffff;">evolink</span>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 6px;font-size:14px;color:#087a50;font-weight:bold;">${greeting}</p>
            <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#10291f;">${content.title}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5f7169;">${content.text}</p>
            ${action}
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#5f7169;">${content.footnote}</p>
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #e3ebe6;font-size:12px;line-height:1.6;color:#8a9c94;">
            Evolink · treino, dieta e evolução conectados<br>
            Dúvidas: <a href="mailto:admin@solairew.com.br" style="color:#087a50;">admin@solairew.com.br</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const plain = `${greeting}\n\n${content.title}\n${content.text}\n\n${link ?? code ?? ""}\n\n${content.footnote}`;
  return { subject: content.subject, html, text: plain };
}
