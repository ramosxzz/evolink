import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const { inviteToken } = await request.json().catch(() => ({ inviteToken: null }));
  if (!token || typeof inviteToken !== "string") return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !serviceRoleKey) return NextResponse.json({ error: "Serviço de convites indisponível." }, { status: 503 });

  const auth = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await auth.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.rpc("redeem_professional_invite", { invite_token: inviteToken, invited_student: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
