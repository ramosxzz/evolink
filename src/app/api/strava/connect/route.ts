import { adminClient, requestUser } from "@/lib/server/billing";
import { authorizeUrl, createState, stravaConfigured } from "@/lib/server/strava";

// Returns the Strava authorization URL for the signed-in student.
export async function POST(request: Request) {
  if (!stravaConfigured()) return Response.json({ error: "Integração com o Strava indisponível." }, { status: 503 });
  const user = await requestUser(request);
  if (!user) return Response.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const admin = adminClient();
  const { data: student } = admin ? await admin.from("student_profiles").select("id").eq("id", user.id).maybeSingle() : { data: null };
  if (!student) return Response.json({ error: "A conexão com o Strava é para alunos." }, { status: 403 });
  return Response.json({ url: authorizeUrl(createState(user.id)) });
}
