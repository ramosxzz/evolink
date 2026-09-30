import { adminClient } from "@/lib/server/billing";
import { importActivity, type StravaConnection } from "@/lib/server/strava";

// Strava push subscription. GET answers the one-time validation; POST receives
// activity events. Strava expects a 200 within 2 seconds, so errors are logged.
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("hub.mode") !== "subscribe" || url.searchParams.get("hub.verify_token") !== process.env.STRAVA_VERIFY_TOKEN || !process.env.STRAVA_VERIFY_TOKEN) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return Response.json({ "hub.challenge": url.searchParams.get("hub.challenge") });
}

type StravaEvent = { object_type: "activity" | "athlete"; object_id: number; aspect_type: "create" | "update" | "delete"; owner_id: number; subscription_id: number; updates?: Record<string, string> };

export async function POST(request: Request) {
  const event = await request.json().catch(() => null) as StravaEvent | null;
  const admin = adminClient();
  const subscription = process.env.STRAVA_SUBSCRIPTION_ID;
  if (!event || !admin || (subscription && String(event.subscription_id) !== subscription)) return Response.json({});
  const { data: connection } = await admin.from("strava_connections").select("*").eq("athlete_id", event.owner_id).maybeSingle<StravaConnection>();
  if (!connection) return Response.json({});
  try {
    if (event.object_type === "athlete" && event.updates?.authorized === "false") {
      await admin.from("strava_connections").delete().eq("student_id", connection.student_id);
    } else if (event.object_type === "activity" && event.aspect_type === "delete") {
      await admin.from("cardio_logs").delete().eq("source", "strava").eq("external_id", String(event.object_id));
    } else if (event.object_type === "activity") {
      await importActivity(admin, connection, event.object_id);
    }
  } catch (error) {
    console.error("[strava] webhook:", error);
  }
  return Response.json({});
}
