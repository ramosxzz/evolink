"use client";

import { resizeImage } from "@/lib/image";
import { avatarUrl, type Author } from "@/lib/social-data";
import { createClient } from "@/lib/supabase/client";

export const specialtyOptions = [
  "Hipertrofia", "Emagrecimento", "Fisiculturismo", "Preparação para campeonato", "Powerlifting", "Corrida",
  "Funcional", "Iniciantes", "Feminino", "Terceira idade", "Reabilitação", "Nutrição esportiva",
];
export const modalityLabels = { online: "Online", presencial: "Presencial", ambos: "Online e presencial" } as const;
export type Modality = keyof typeof modalityLabels;

export type CoachCard = {
  id: string; author: Author; headline: string | null; about: string | null; specialties: string[]; modality: Modality;
  city: string | null; state: string | null; priceFromCents: number | null; yearsExperience: number | null; instagram: string | null;
  accepting: boolean; rating: number | null; reviews: number; transformations: number; students: number;
};
export type Portfolio = {
  headline: string; about: string; specialties: string[]; modality: Modality; city: string; state: string;
  priceFromCents: number | null; yearsExperience: number | null; instagram: string; accepting: boolean; published: boolean;
};
export type Transformation = { id: string; title: string; description: string | null; durationWeeks: number | null; beforeUrl: string; afterUrl: string; beforePath: string; afterPath: string };
export type Testimonial = { id: string; authorId: string; authorName: string; rating: number; body: string; status: "pending" | "published" | "hidden"; createdAt: string };
export type Lead = { id: string; requesterId: string; requesterName: string; goal: string; message: string | null; status: "new" | "invited" | "declined"; createdAt: string };

type DirectoryRow = {
  coach_id: string; name: string; avatar_path: string | null; avatar_updated_at: string | null; frame: string;
  headline: string | null; about: string | null; specialties: string[]; modality: Modality; city: string | null; state: string | null;
  price_from_cents: number | null; years_experience: number | null; instagram: string | null; accepting_students: boolean;
  rating: number | null; reviews: number; transformations: number; students: number;
};

export const emptyPortfolio: Portfolio = { headline: "", about: "", specialties: [], modality: "online", city: "", state: "", priceFromCents: null, yearsExperience: null, instagram: "", accepting: true, published: false };
export const portfolioImage = (path: string) => createClient().storage.from("portfolio").getPublicUrl(path).data.publicUrl;
export const priceLabel = (cents: number | null) => cents ? `a partir de ${(cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}/mês` : null;

const toCard = (row: DirectoryRow): CoachCard => ({
  id: row.coach_id,
  author: { id: row.coach_id, name: row.name, avatarUrl: avatarUrl(row.avatar_path, row.avatar_updated_at), frame: row.frame },
  headline: row.headline, about: row.about, specialties: row.specialties ?? [], modality: row.modality, city: row.city, state: row.state,
  priceFromCents: row.price_from_cents, yearsExperience: row.years_experience, instagram: row.instagram, accepting: row.accepting_students,
  rating: row.rating === null ? null : Number(row.rating), reviews: row.reviews, transformations: row.transformations, students: row.students,
});

const toTransformation = (row: { id: string; title: string; description: string | null; duration_weeks: number | null; before_path: string; after_path: string }): Transformation => ({
  id: row.id, title: row.title, description: row.description, durationWeeks: row.duration_weeks,
  beforePath: row.before_path, afterPath: row.after_path, beforeUrl: portfolioImage(row.before_path), afterUrl: portfolioImage(row.after_path),
});

const toTestimonial = (row: { id: string; author_id: string; author_name: string; rating: number; body: string; status: Testimonial["status"]; created_at: string }): Testimonial => ({
  id: row.id, authorId: row.author_id, authorName: row.author_name, rating: row.rating, body: row.body, status: row.status, createdAt: row.created_at,
});

export async function getCoachDirectory() {
  const { data } = await createClient().rpc("coach_directory");
  return ((data ?? []) as DirectoryRow[]).map(toCard);
}

/** Everything the public coach page needs, plus the viewer's relation to the coach. */
export async function getCoachPage(coachId: string, viewerId: string) {
  const supabase = createClient();
  const [card, transformations, testimonials, relation, lead] = await Promise.all([
    supabase.rpc("coach_directory", { target_coach: coachId }),
    supabase.from("portfolio_transformations").select("id, title, description, duration_weeks, before_path, after_path").eq("coach_id", coachId).order("position").order("created_at", { ascending: false }),
    supabase.from("portfolio_testimonials").select("id, author_id, author_name, rating, body, status, created_at").eq("coach_id", coachId).order("created_at", { ascending: false }),
    supabase.from("professional_students").select("status").eq("professional_id", coachId).eq("student_id", viewerId).maybeSingle(),
    supabase.from("coach_leads").select("id, status").eq("coach_id", coachId).eq("requester_id", viewerId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const row = ((card.data ?? []) as DirectoryRow[])[0];
  if (!row) return null;
  const allTestimonials = (testimonials.data ?? []).map(toTestimonial);
  return {
    coach: toCard(row),
    transformations: (transformations.data ?? []).map(toTransformation),
    testimonials: allTestimonials.filter(item => item.status === "published"),
    ownTestimonial: allTestimonials.find(item => item.authorId === viewerId) ?? null,
    wasStudent: Boolean(relation.data),
    isStudent: relation.data?.status === "active",
    openLead: lead.data?.status === "new" ? lead.data.id as string : null,
  };
}

export async function getOwnPortfolio(coachId: string) {
  const supabase = createClient();
  const [portfolio, transformations, testimonials, leads] = await Promise.all([
    supabase.from("coach_portfolios").select("*").eq("coach_id", coachId).maybeSingle(),
    supabase.from("portfolio_transformations").select("id, title, description, duration_weeks, before_path, after_path").eq("coach_id", coachId).order("position").order("created_at", { ascending: false }),
    supabase.from("portfolio_testimonials").select("id, author_id, author_name, rating, body, status, created_at").eq("coach_id", coachId).order("created_at", { ascending: false }),
    supabase.from("coach_leads").select("id, requester_id, requester_name, goal, message, status, created_at").eq("coach_id", coachId).order("created_at", { ascending: false }).limit(50),
  ]);
  const row = portfolio.data;
  return {
    portfolio: row ? {
      headline: row.headline ?? "", about: row.about ?? "", specialties: row.specialties ?? [], modality: row.modality, city: row.city ?? "", state: row.state ?? "",
      priceFromCents: row.price_from_cents, yearsExperience: row.years_experience, instagram: row.instagram ?? "", accepting: row.accepting_students, published: row.published,
    } as Portfolio : null,
    transformations: (transformations.data ?? []).map(toTransformation),
    testimonials: (testimonials.data ?? []).map(toTestimonial),
    leads: (leads.data ?? []).map(lead => ({ id: lead.id, requesterId: lead.requester_id, requesterName: lead.requester_name, goal: lead.goal, message: lead.message, status: lead.status, createdAt: lead.created_at })) as Lead[],
  };
}

export async function savePortfolio(coachId: string, value: Portfolio) {
  return createClient().from("coach_portfolios").upsert({
    coach_id: coachId,
    headline: value.headline.trim() || null,
    about: value.about.trim() || null,
    specialties: value.specialties,
    modality: value.modality,
    city: value.city.trim() || null,
    state: value.state || null,
    price_from_cents: value.priceFromCents,
    years_experience: value.yearsExperience,
    instagram: value.instagram.replace(/^@/, "").trim() || null,
    accepting_students: value.accepting,
    published: value.published,
  });
}

export async function addTransformation(coachId: string, input: { title: string; description: string; durationWeeks: number | null; before: File; after: File }) {
  const supabase = createClient();
  const id = crypto.randomUUID();
  const upload = async (file: File, side: "antes" | "depois") => {
    const image = await resizeImage(file, 1400);
    const path = `${coachId}/${id}-${side}.jpg`;
    const { error } = await supabase.storage.from("portfolio").upload(path, image, { contentType: image.type });
    if (error) throw error;
    return path;
  };
  let paths: string[] = [];
  try {
    paths = await Promise.all([upload(input.before, "antes"), upload(input.after, "depois")]);
  } catch (error) {
    return { data: null, error: error as Error };
  }
  const { data, error } = await supabase.from("portfolio_transformations").insert({
    id, coach_id: coachId, title: input.title.trim(), description: input.description.trim() || null,
    duration_weeks: input.durationWeeks, before_path: paths[0], after_path: paths[1], consent_confirmed: true,
  }).select("id, title, description, duration_weeks, before_path, after_path").single();
  if (error) await supabase.storage.from("portfolio").remove(paths);
  return { data: data ? toTransformation(data) : null, error };
}

export async function removeTransformation(item: Transformation) {
  const supabase = createClient();
  const { error } = await supabase.from("portfolio_transformations").delete().eq("id", item.id);
  if (!error) await supabase.storage.from("portfolio").remove([item.beforePath, item.afterPath]);
  return { error };
}

export const setTestimonialStatus = (id: string, status: "published" | "hidden") =>
  createClient().rpc("set_testimonial_status", { target_testimonial: id, new_status: status });

export const respondToLead = (id: string, accept: boolean) =>
  createClient().rpc("respond_to_lead", { target_lead: id, accept });

export async function writeTestimonial(coachId: string, authorId: string, rating: number, body: string) {
  const { data, error } = await createClient().from("portfolio_testimonials")
    .insert({ coach_id: coachId, author_id: authorId, author_name: "", rating, body: body.trim() })
    .select("id, author_id, author_name, rating, body, status, created_at").single();
  return { data: data ? toTestimonial(data) : null, error };
}

export const deleteTestimonial = (id: string) => createClient().from("portfolio_testimonials").delete().eq("id", id);

export async function sendLead(coachId: string, requesterId: string, goal: string, message: string) {
  const { data, error } = await createClient().from("coach_leads")
    .insert({ coach_id: coachId, requester_id: requesterId, goal: goal.trim(), message: message.trim() || null })
    .select("id").single();
  return { id: data?.id as string | undefined, error };
}

export const cancelLead = (id: string) => createClient().from("coach_leads").delete().eq("id", id);
