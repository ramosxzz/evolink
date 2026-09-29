import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { Agent, request } from "node:https";

// Banco Inter API (Pix Cobrança). Every call uses mTLS with the integration
// certificate; the OAuth token lasts one hour and is cached per scope, because
// the token endpoint allows only 5 calls per minute.

type CobStatus = "ATIVA" | "CONCLUIDA" | "REMOVIDA_PELO_USUARIO_RECEBEDOR" | "REMOVIDA_PELO_PSP";
export type InterCob = { txid: string; status: CobStatus; pixCopiaECola?: string; pix?: { endToEndId: string; valor: string; horario: string }[] };

const env = () => ({
  clientId: process.env.INTER_CLIENT_ID,
  clientSecret: process.env.INTER_CLIENT_SECRET,
  certPath: process.env.INTER_CERT_PATH,
  keyPath: process.env.INTER_KEY_PATH,
  pixKey: process.env.INTER_PIX_KEY,
  account: process.env.INTER_ACCOUNT,
  host: process.env.INTER_ENV === "sandbox" ? "cdpj-sandbox.partners.uatinter.co" : "cdpj.partners.bancointer.com.br",
});

export const interConfigured = () => {
  const config = env();
  return Boolean(config.clientId && config.clientSecret && config.certPath && config.keyPath && config.pixKey);
};

/** Local development without Inter credentials: fake charges that can be "paid" by hand. */
export const interMockMode = () => !interConfigured() && process.env.NODE_ENV !== "production";

let agent: Agent | null = null;
const tokens = new Map<string, { value: string; expiresAt: number }>();

function call<T>(method: string, path: string, { body, form, token }: { body?: unknown; form?: Record<string, string>; token?: string } = {}) {
  const config = env();
  agent ??= new Agent({ cert: readFileSync(config.certPath!), key: readFileSync(config.keyPath!), keepAlive: true });
  const payload = form ? new URLSearchParams(form).toString() : body === undefined ? undefined : JSON.stringify(body);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (payload) headers["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json";
  if (payload) headers["Content-Length"] = String(Buffer.byteLength(payload));
  if (token) headers.Authorization = `Bearer ${token}`;
  if (token && config.account) headers["x-conta-corrente"] = config.account;

  return new Promise<T>((resolve, reject) => {
    const req = request({ host: config.host, path, method, agent: agent!, headers, timeout: 15000 }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        const status = res.statusCode ?? 0;
        if (status >= 200 && status < 300) return resolve((data ? JSON.parse(data) : {}) as T);
        reject(new Error(`Inter ${method} ${path} respondeu ${status}: ${data.slice(0, 500)}`));
      });
    });
    req.on("timeout", () => req.destroy(new Error(`Inter ${method} ${path}: tempo esgotado`)));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function token(scope: string) {
  const cached = tokens.get(scope);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;
  const config = env();
  const result = await call<{ access_token: string; expires_in: number }>("POST", "/oauth/v2/token", {
    form: { client_id: config.clientId!, client_secret: config.clientSecret!, grant_type: "client_credentials", scope },
  });
  tokens.set(scope, { value: result.access_token, expiresAt: Date.now() + result.expires_in * 1000 });
  return result.access_token;
}

export const newTxid = () => randomBytes(24).toString("base64").replace(/[^a-zA-Z0-9]/g, "").padEnd(32, "0").slice(0, 32);

export async function createCob({ txid, amountCents, expiresInSeconds, description }: { txid: string; amountCents: number; expiresInSeconds: number; description: string }) {
  if (interMockMode()) return { txid, status: "ATIVA", pixCopiaECola: `00020126MOCK-EVOLINK-${txid}5204000053039865802BR6304ABCD` } satisfies InterCob;
  return call<InterCob>("PUT", `/pix/v2/cob/${txid}`, {
    token: await token("cob.write"),
    body: {
      calendario: { expiracao: expiresInSeconds },
      valor: { original: (amountCents / 100).toFixed(2) },
      chave: env().pixKey,
      solicitacaoPagador: description.slice(0, 140),
    },
  });
}

export async function getCob(txid: string) {
  return call<InterCob>("GET", `/pix/v2/cob/${txid}`, { token: await token("cob.read") });
}

let webhookRegistered = false;
/** Registers the Pix webhook once per process. Failures are logged; status polling still works. */
export async function ensureWebhook() {
  if (webhookRegistered || !interConfigured()) return;
  const site = process.env.PUBLIC_SITE_URL || "https://evolink.solairew.com.br";
  try {
    await call("PUT", `/pix/v2/webhook/${encodeURIComponent(env().pixKey!)}`, {
      token: await token("webhook.write"),
      body: { webhookUrl: `${site}/api/billing/inter/webhook` },
    });
    webhookRegistered = true;
  } catch (error) {
    console.error("[inter] não foi possível registrar o webhook:", error);
  }
}
