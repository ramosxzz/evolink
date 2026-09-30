import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Strava API: OAuth connect, token refresh and activity import into cardio_logs.

const API = "https://www.strava.com/api/v3";
export const site = () => process.env.PUBLIC_SITE_URL || "https://evolink.solairew.com.br";
export const stravaConfigured = () => Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
export const stravaCallbackUrl = () => `${site()}/api/strava/callback`;

export type StravaConnection = { student_id: string; athlete_id: number; access_token: string; refresh_token: string; expires_at: string };
type StravaActivity = {
  id: number; name: string; sport_type?: string; type?: string; trainer?: boolean; start_date: string;
  moving_time: number; elapsed_time: number; distance: number; average_heartrate?: number; total_elevation_gain?: number;
};

// OAuth state carries the student id, signed so the callback can trust it.
const sign = (payload: string) => createHmac("sha256", process.env.STRAVA_CLIENT_SECRET!).update(payload).digest("base64url");
export function createState(studentId: string) {
  const payload = `${studentId}.${Date.now() + 15 * 60_000}`;
  return `${payload}.${sign(payload)}`;
}
export function readState(state: string) {
  const [studentId, expires, signature] = state.split(".");
  if (!studentId || !expires || !signature || Number(expires) < Date.now()) return null;
  const expected = Buffer.from(sign(`${studentId}.${expires}`));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? studentId : null;
}

export function authorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!, redirect_uri: stravaCallbackUrl(), response_type: "code",
    approval_prompt: "auto", scope: "read,activity:read_all", state,
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, ...body }),
  });
  if (!response.ok) throw new Error(`Strava token ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json() as Promise<{ access_token: string; refresh_token: string; expires_at: number; scope?: string; athlete?: { id: number; firstname?: string; lastname?: string } }>;
}

export const exchangeCode = (code: string) => tokenRequest({ code, grant_type: "authorization_code" });

/** Returns a valid access token, refreshing (and saving) it when it is about to expire. */
export async function accessToken(admin: SupabaseClient, connection: StravaConnection) {
  if (new Date(connection.expires_at).getTime() > Date.now() + 5 * 60_000) return connection.access_token;
  const refreshed = await tokenRequest({ grant_type: "refresh_token", refresh_token: connection.refresh_token });
  await admin.from("strava_connections").update({
    access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
  }).eq("student_id", connection.student_id);
  return refreshed.access_token;
}

async function api<T>(token: string, path: string) {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Strava ${path} ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json() as Promise<T>;
}

function modality(activity: StravaActivity) {
  const sport = activity.sport_type ?? activity.type ?? "";
  if (/Run/.test(sport)) return activity.trainer || sport === "VirtualRun" ? "Esteira" : "Corrida";
  if (/Walk|Hike/.test(sport)) return "Caminhada";
  if (/Ride|Cycl|Velomobile|Handcycle/.test(sport)) return "Bicicleta";
  if (/Swim/.test(sport)) return "Natação";
  if (/Elliptical/.test(sport)) return "Elíptico";
  if (/StairStepper/.test(sport)) return "Escada";
  return "Outro";
}

function toCardioLog(studentId: string, activity: StravaActivity) {
  const km = activity.distance / 1000;
  const kind = modality(activity);
  return {
    student_id: studentId,
    source: "strava",
    external_id: String(activity.id),
    modality: kind,
    completed_at: new Date(new Date(activity.start_date).getTime() + activity.elapsed_time * 1000).toISOString(),
    duration_minutes: Math.min(600, Math.max(1, Math.round(activity.moving_time / 60))),
    distance_km: km >= 0.01 && km <= 500 ? Math.round(km * 100) / 100 : null,
    avg_heart_rate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    elevation_m: activity.total_elevation_gain ? Math.round(activity.total_elevation_gain * 10) / 10 : null,
    note: activity.name?.slice(0, 280) || null,
  };
}

export async function importActivity(admin: SupabaseClient, connection: StravaConnection, activityId: number) {
  const token = await accessToken(admin, connection);
  const activity = await api<StravaActivity>(token, `/activities/${activityId}`);
  if (activity.moving_time < 60) return;
  const { error } = await admin.from("cardio_logs").upsert(toCardioLog(connection.student_id, activity), { onConflict: "source,external_id" });
  if (error) throw error;
  await admin.from("strava_connections").update({ last_sync_at: new Date().toISOString() }).eq("student_id", connection.student_id);
}

/** Imports activities since `days` ago (used right after connecting). */
export async function importRecent(admin: SupabaseClient, connection: StravaConnection, days = 30) {
  const token = await accessToken(admin, connection);
  const after = Math.floor((Date.now() - days * 86_400_000) / 1000);
  const activities = await api<StravaActivity[]>(token, `/athlete/activities?after=${after}&per_page=100`);
  const rows = activities.filter(activity => activity.moving_time >= 60).map(activity => toCardioLog(connection.student_id, activity));
  if (rows.length) {
    const { error } = await admin.from("cardio_logs").upsert(rows, { onConflict: "source,external_id" });
    if (error) throw error;
  }
  await admin.from("strava_connections").update({ last_sync_at: new Date().toISOString() }).eq("student_id", connection.student_id);
  return rows.length;
}

export async function deauthorize(token: string) {
  await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
}
