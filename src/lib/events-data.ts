"use client";

import { resizeImage } from "@/lib/image";
import { localDate } from "@/lib/dates";
import { avatarUrl, type Author } from "@/lib/social-data";
import { createClient } from "@/lib/supabase/client";

export type Federation = { code: string; name: string; natural_only: boolean };
export type EventKind = "campeonato" | "seletiva" | "workshop" | "encontro" | "outro";
export type AttendanceRole = "atleta" | "torcida" | "treinador";

export type EventSummary = {
  id: string;
  title: string;
  kind: EventKind;
  federationCode: string;
  federationName: string;
  startsOn: string;
  endsOn: string | null;
  city: string;
  state: string;
  venue: string | null;
  coverUrl: string | null;
  status: "published" | "cancelled";
  athletes: number;
  fans: number;
  viewerRole: AttendanceRole | null;
};

export type EventDetail = EventSummary & {
  createdBy: string;
  creatorName: string;
  address: string | null;
  registrationUrl: string | null;
  description: string | null;
  categories: string[];
  federationOther: string | null;
  audienceInvitedAt: string | null;
  attendees: (Author & { role: AttendanceRole; category: string | null })[];
};

export type EventTip = { id: string; kind: "hospedagem" | "alimentacao" | "geral"; body: string; url: string | null; createdAt: string; author: Author };
export type EventRide = { id: string; kind: "oferta" | "pedido"; fromCity: string; departureDate: string | null; seats: number | null; contact: string | null; note: string | null; createdAt: string; author: Author };
export type FeedbackSummary = { count: number; organization: number | null; judging: number | null; structure: number | null; punctuality: number | null; comments: { comment: string; created_on: string }[] };

export const eventKinds: Record<EventKind, string> = { campeonato: "Campeonato", seletiva: "Seletiva", workshop: "Workshop", encontro: "Encontro", outro: "Outro" };
export const bodybuildingCategories = [
  "Bodybuilding", "Classic Physique", "Men's Physique", "Bikini", "Wellness", "Figure", "Women's Physique",
  "Fit Model", "Estreantes", "Masters", "Juniores", "Natural",
];
export const brazilianStates = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

const eventColumns = "id, title, kind, federation_code, federation_other, starts_on, ends_on, city, state, venue, cover_path, status, federations(name), event_attendance(user_id, role)";
type ProfileRow = { id: string; display_name: string; avatar_path: string | null; frame: string | null; avatar_updated_at: string | null };

function coverUrl(path: string | null) {
  if (!path) return null;
  return createClient().storage.from("event-covers").getPublicUrl(path).data.publicUrl;
}

function toAuthor(row: ProfileRow | null | undefined, fallbackId: string): Author {
  return { id: row?.id ?? fallbackId, name: row?.display_name ?? "Atleta Evolink", avatarUrl: avatarUrl(row?.avatar_path ?? null, row?.avatar_updated_at), frame: row?.frame ?? "none" };
}

type EventRow = {
  id: string; title: string; kind: EventKind; federation_code: string; federation_other: string | null; starts_on: string; ends_on: string | null;
  city: string; state: string; venue: string | null; cover_path: string | null; status: "published" | "cancelled";
  federations: { name: string } | null; event_attendance: { user_id: string; role: AttendanceRole }[] | null;
};

function toSummary(row: EventRow, viewerId: string): EventSummary {
  const attendance = row.event_attendance ?? [];
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    federationCode: row.federation_code,
    federationName: row.federation_code === "outra" && row.federation_other ? row.federation_other : row.federations?.name ?? "",
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    city: row.city,
    state: row.state,
    venue: row.venue,
    coverUrl: coverUrl(row.cover_path),
    status: row.status,
    athletes: attendance.filter(item => item.role === "atleta").length,
    fans: attendance.filter(item => item.role === "torcida").length,
    viewerRole: attendance.find(item => item.user_id === viewerId)?.role ?? null,
  };
}

export async function getFederations() {
  const { data } = await createClient().from("federations").select("code, name, natural_only").order("position");
  return (data ?? []) as Federation[];
}

export async function getEvents(viewerId: string, filters: { period: "upcoming" | "past"; state?: string; federation?: string }) {
  let query = createClient().from("events").select(eventColumns).limit(100);
  const today = localDate();
  query = filters.period === "upcoming" ? query.gte("starts_on", today).order("starts_on") : query.lt("starts_on", today).order("starts_on", { ascending: false });
  if (filters.state) query = query.eq("state", filters.state);
  if (filters.federation) query = query.eq("federation_code", filters.federation);
  const { data, error } = await query;
  return { events: ((data ?? []) as unknown as EventRow[]).map(row => toSummary(row, viewerId)), error };
}

export async function getEvent(eventId: string, viewerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select(`${eventColumns}, created_by, address, registration_url, description, categories, audience_invited_at`)
    .eq("id", eventId)
    .maybeSingle();
  if (error || !data) return { event: null, error: error ?? new Error("Evento não encontrado") };
  const row = data as unknown as EventRow & { created_by: string; address: string | null; registration_url: string | null; description: string | null; categories: string[]; audience_invited_at: string | null };

  const attendanceRows = await supabase.from("event_attendance").select("user_id, role, category").eq("event_id", eventId).order("created_at");
  const ids = [row.created_by, ...(attendanceRows.data ?? []).map(item => item.user_id)];
  const { data: profiles } = await supabase.from("social_profiles").select("id, display_name, avatar_path, frame, avatar_updated_at").in("id", ids);
  const byId = new Map((profiles ?? []).map(profile => [profile.id, profile as ProfileRow]));

  return {
    event: {
      ...toSummary(row, viewerId),
      createdBy: row.created_by,
      creatorName: byId.get(row.created_by)?.display_name ?? "Treinador",
      address: row.address,
      registrationUrl: row.registration_url,
      description: row.description,
      categories: row.categories ?? [],
      federationOther: row.federation_other,
      audienceInvitedAt: row.audience_invited_at,
      attendees: (attendanceRows.data ?? []).map(item => ({ ...toAuthor(byId.get(item.user_id), item.user_id), role: item.role as AttendanceRole, category: item.category })),
    } as EventDetail,
    error: null,
  };
}

export type EventInput = {
  title: string; kind: EventKind; federationCode: string; federationOther?: string; startsOn: string; endsOn?: string;
  city: string; state: string; venue?: string; address?: string; registrationUrl?: string; description?: string; categories: string[];
};

export async function saveEvent(professionalId: string, input: EventInput, cover?: File, eventId?: string) {
  const supabase = createClient();
  let coverPath: string | undefined;
  if (cover) {
    const image = await resizeImage(cover, 1600).catch((error: Error) => error);
    if (image instanceof Error) return { id: null, error: image };
    coverPath = `${professionalId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("event-covers").upload(coverPath, image, { contentType: image.type });
    if (error) return { id: null, error };
  }
  const payload = {
    created_by: professionalId,
    title: input.title.trim(),
    kind: input.kind,
    federation_code: input.federationCode,
    federation_other: input.federationCode === "outra" ? input.federationOther?.trim() || null : null,
    starts_on: input.startsOn,
    ends_on: input.endsOn || null,
    city: input.city.trim(),
    state: input.state,
    venue: input.venue?.trim() || null,
    address: input.address?.trim() || null,
    registration_url: input.registrationUrl?.trim() || null,
    description: input.description?.trim() || null,
    categories: input.categories,
    ...(coverPath ? { cover_path: coverPath } : {}),
  };
  const query = eventId ? supabase.from("events").update(payload).eq("id", eventId) : supabase.from("events").insert(payload);
  const { data, error } = await query.select("id").single();
  return { id: data?.id ?? null, error };
}

export async function setEventStatus(eventId: string, status: "published" | "cancelled") {
  return createClient().from("events").update({ status }).eq("id", eventId);
}

export async function setAttendance(eventId: string, userId: string, role: AttendanceRole | null, category?: string) {
  const supabase = createClient();
  if (!role) return supabase.from("event_attendance").delete().eq("event_id", eventId).eq("user_id", userId);
  return supabase.from("event_attendance").upsert({ event_id: eventId, user_id: userId, role, category: role === "atleta" ? category || null : null }, { onConflict: "event_id,user_id" });
}

export async function inviteAudience(eventId: string) {
  const { data, error } = await createClient().rpc("invite_event_audience", { target_event: eventId });
  return { sent: (data as number | null) ?? 0, error };
}

async function withAuthors<T extends { author_id: string }>(rows: T[]) {
  const ids = [...new Set(rows.map(row => row.author_id))];
  if (!ids.length) return new Map<string, Author>();
  const { data } = await createClient().from("social_profiles").select("id, display_name, avatar_path, frame, avatar_updated_at").in("id", ids);
  return new Map((data ?? []).map(row => [row.id, toAuthor(row as ProfileRow, row.id)]));
}

export async function getTips(eventId: string) {
  const { data } = await createClient().from("event_tips").select("id, kind, body, url, created_at, author_id").eq("event_id", eventId).order("created_at", { ascending: false });
  const authors = await withAuthors(data ?? []);
  return (data ?? []).map(row => ({ id: row.id, kind: row.kind, body: row.body, url: row.url, createdAt: row.created_at, author: authors.get(row.author_id) ?? toAuthor(null, row.author_id) })) as EventTip[];
}

export async function addTip(eventId: string, authorId: string, input: { kind: EventTip["kind"]; body: string; url?: string }) {
  return createClient().from("event_tips").insert({ event_id: eventId, author_id: authorId, kind: input.kind, body: input.body.trim(), url: input.url?.trim() || null });
}

export async function deleteTip(tipId: string) {
  return createClient().from("event_tips").delete().eq("id", tipId);
}

export async function getRides(eventId: string) {
  const { data } = await createClient().from("event_rides").select("id, kind, from_city, departure_date, seats, contact, note, created_at, author_id").eq("event_id", eventId).order("created_at", { ascending: false });
  const authors = await withAuthors(data ?? []);
  return (data ?? []).map(row => ({
    id: row.id, kind: row.kind, fromCity: row.from_city, departureDate: row.departure_date, seats: row.seats, contact: row.contact, note: row.note,
    createdAt: row.created_at, author: authors.get(row.author_id) ?? toAuthor(null, row.author_id),
  })) as EventRide[];
}

export async function addRide(eventId: string, authorId: string, input: { kind: EventRide["kind"]; fromCity: string; departureDate?: string; seats?: number; contact?: string; note?: string }) {
  return createClient().from("event_rides").insert({
    event_id: eventId, author_id: authorId, kind: input.kind, from_city: input.fromCity.trim(), departure_date: input.departureDate || null,
    seats: input.seats ?? null, contact: input.contact?.trim() || null, note: input.note?.trim() || null,
  });
}

export async function deleteRide(rideId: string) {
  return createClient().from("event_rides").delete().eq("id", rideId);
}

export async function getFeedback(eventId: string, viewerId: string) {
  const supabase = createClient();
  const [summary, mine] = await Promise.all([
    supabase.rpc("event_feedback_summary", { target_event: eventId }),
    supabase.from("event_feedback").select("id").eq("event_id", eventId).eq("author_id", viewerId).maybeSingle(),
  ]);
  return { summary: (summary.data ?? { count: 0, comments: [] }) as FeedbackSummary, alreadySent: Boolean(mine.data) };
}

export async function sendFeedback(eventId: string, authorId: string, input: { organization: number; judging: number; structure: number; punctuality: number; comment?: string }) {
  return createClient().from("event_feedback").insert({ event_id: eventId, author_id: authorId, ...input, comment: input.comment?.trim() || null, accepted_terms: true });
}

/** Search links for lodging near the event city, on the event dates. */
export function lodgingLinks(event: Pick<EventSummary, "city" | "state" | "startsOn" | "endsOn">) {
  const checkIn = new Date(`${event.startsOn}T12:00:00`);
  checkIn.setDate(checkIn.getDate() - 1);
  const checkOut = new Date(`${event.endsOn ?? event.startsOn}T12:00:00`);
  checkOut.setDate(checkOut.getDate() + 1);
  const place = `${event.city}, ${event.state}, Brasil`;
  const inDate = localDate(checkIn);
  const outDate = localDate(checkOut);
  return {
    airbnb: `https://www.airbnb.com.br/s/${encodeURIComponent(place)}/homes?checkin=${inDate}&checkout=${outDate}&adults=1`,
    booking: `https://www.booking.com/searchresults.pt-br.html?ss=${encodeURIComponent(place)}&checkin=${inDate}&checkout=${outDate}&group_adults=1`,
    maps: `https://www.google.com/maps/search/${encodeURIComponent(`hotéis perto de ${place}`)}`,
  };
}
