import { adminClient, requestUser } from "@/lib/server/billing";
import { accessToken, deauthorize, type StravaConnection } from "@/lib/server/strava";

// Revokes Evolink's access on Strava. Imported activities stay in the history.
export async function POST(request: Request) {
  const user = await requestUser(request);
  const admin = adminClient();
  if (!user || !admin) return Response.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const { data: connection } = await admin.from("strava_connections").select("*").eq("student_id", user.id).maybeSingle<StravaConnection>();
  if (connection) {
    await deauthorize(await accessToken(admin, connection).catch(() => connection.access_token));
    await admin.from("strava_connections").delete().eq("student_id", user.id);
  }
  return Response.json({ ok: true });
}
