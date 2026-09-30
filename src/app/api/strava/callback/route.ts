import { adminClient } from "@/lib/server/billing";
import { exchangeCode, importRecent, readState, site, type StravaConnection } from "@/lib/server/strava";

// Strava redirects here after the student authorizes (or cancels).
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Behind the proxy request.url carries the container address, so use the public site.
  const back = (status: string) => Response.redirect(new URL(`/aluno/cardio?strava=${status}`, site()), 302);
  const studentId = readState(url.searchParams.get("state") ?? "");
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !code) return back("cancelado");
  if (!studentId) return back("expirado");
  if (!(url.searchParams.get("scope") ?? "").includes("activity:read")) return back("sem-permissao");
  const admin = adminClient();
  if (!admin) return back("erro");
  try {
    const token = await exchangeCode(code);
    if (!token.athlete) return back("erro");
    const connection = {
      student_id: studentId,
      athlete_id: token.athlete.id,
      athlete_name: [token.athlete.firstname, token.athlete.lastname].filter(Boolean).join(" ") || null,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
      scope: token.scope ?? url.searchParams.get("scope"),
    };
    // One Strava account per student: a reconnect from another student replaces it.
    await admin.from("strava_connections").delete().eq("athlete_id", connection.athlete_id).neq("student_id", studentId);
    const { error } = await admin.from("strava_connections").upsert(connection, { onConflict: "student_id" });
    if (error) throw error;
    await importRecent(admin, connection as StravaConnection).catch(error => console.error("[strava] importação inicial:", error));
    return back("conectado");
  } catch (error) {
    console.error("[strava] callback:", error);
    return back("erro");
  }
}
