/** Sends an e-mail through the Resend API. Returns false when it fails. */
export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email] sem RESEND_API_KEY, não enviado para ${to}: ${subject}`);
    return process.env.NODE_ENV !== "production";
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "Evolink <admin@solairew.com.br>", to: [to], subject, html, text }),
  });
  if (!response.ok) console.error(`[email] Resend respondeu ${response.status}: ${await response.text()}`);
  return response.ok;
}
