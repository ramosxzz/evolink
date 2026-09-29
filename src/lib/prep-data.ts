"use client";

import { addDays, localDate } from "@/lib/dates";
import { avatarUrl, type Author } from "@/lib/social-data";
import { createClient } from "@/lib/supabase/client";

export type ContestPrep = {
  id: string;
  student_id: string;
  event_id: string | null;
  title: string;
  stage_date: string;
  category: string | null;
  target_weight_kg: number | null;
  coach_notes: string | null;
  status: "active" | "done";
  created_at: string;
};
export type ChecklistItem = { id: string; label: string; done: boolean; position: number };
export type PoseLog = { practiced_on: string; poses: string[] };
export type CompetitionResult = {
  id: string;
  athlete_id: string;
  event_id: string | null;
  event_name: string;
  federation_code: string;
  competed_on: string;
  state: string | null;
  category: string;
  placement: number | null;
  is_overall: boolean;
  notes: string | null;
};

export const defaultChecklist = [
  "Fazer a inscrição",
  "Filiação à federação em dia",
  "Sunga, biquíni ou traje da categoria",
  "Agendar bronzeamento",
  "Ensaiar a rotina de poses com o treinador",
  "Reservar hospedagem",
  "Combinar transporte",
  "Separar documentos para a pesagem",
];

// Main poses per category. Federations can differ; confirm the rules of the event.
export const posesByCategory: Record<string, string[]> = {
  Bodybuilding: ["Duplo bíceps de frente", "Dorsais de frente", "Peitoral de lado", "Duplo bíceps de costas", "Dorsais de costas", "Tríceps de lado", "Abdômen e coxas", "Most muscular"],
  "Classic Physique": ["Duplo bíceps de frente", "Peitoral de lado", "Duplo bíceps de costas", "Abdômen e coxas", "Pose clássica favorita", "Vacuum"],
  "Men's Physique": ["Frente", "Lado", "Costas", "Transições"],
  Bikini: ["Frente", "Lado", "Costas", "Pose de frente", "Pose de costas", "Caminhada (T-walk)"],
  Wellness: ["Frente", "Lado", "Costas", "Pose de frente", "Pose de costas", "Caminhada (T-walk)"],
  Figure: ["Frente", "Lado", "Costas", "Quartos de volta", "Caminhada"],
  "Women's Physique": ["Duplo bíceps de frente", "Peitoral de lado", "Duplo bíceps de costas", "Tríceps de lado", "Abdômen e coxas"],
};
export const defaultPoses = ["Frente", "Lado", "Costas", "Transições"];

export async function getActivePrep(studentId: string) {
  const supabase = createClient();
  const { data: prep } = await supabase.from("contest_preps").select("*").eq("student_id", studentId).eq("status", "active").order("stage_date").limit(1).maybeSingle();
  if (!prep) return { prep: null, checklist: [] as ChecklistItem[], poses: [] as PoseLog[], weights: [] as { recorded_on: string; weight_kg: number }[] };
  const [checklist, poses, weights] = await Promise.all([
    supabase.from("prep_checklist_items").select("id, label, done, position").eq("prep_id", prep.id).order("position").order("created_at"),
    supabase.from("prep_pose_logs").select("practiced_on, poses").eq("prep_id", prep.id).gte("practiced_on", localDate(addDays(-30))),
    supabase.from("progress_records").select("recorded_on, weight_kg").eq("student_id", studentId).not("weight_kg", "is", null).gte("recorded_on", localDate(addDays(-120))).order("recorded_on"),
  ]);
  return {
    prep: prep as ContestPrep,
    checklist: (checklist.data ?? []) as ChecklistItem[],
    poses: (poses.data ?? []) as PoseLog[],
    weights: (weights.data ?? []).map(row => ({ recorded_on: row.recorded_on, weight_kg: Number(row.weight_kg) })),
  };
}

export async function createPrep(studentId: string, input: { title: string; stageDate: string; category?: string; targetWeight?: number; eventId?: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contest_preps")
    .insert({ student_id: studentId, title: input.title.trim(), stage_date: input.stageDate, category: input.category || null, target_weight_kg: input.targetWeight ?? null, event_id: input.eventId || null })
    .select("id")
    .single();
  if (error || !data) return { error: error ?? new Error("Não foi possível criar a preparação.") };
  await supabase.from("prep_checklist_items").insert(defaultChecklist.map((label, position) => ({ prep_id: data.id, label, position })));
  return { error: null };
}

export async function finishPrep(prepId: string) {
  return createClient().from("contest_preps").update({ status: "done" }).eq("id", prepId);
}

export async function saveCoachNotes(prepId: string, notes: string) {
  return createClient().from("contest_preps").update({ coach_notes: notes.trim() || null }).eq("id", prepId);
}

export async function addChecklistItem(prepId: string, label: string, position: number) {
  return createClient().from("prep_checklist_items").insert({ prep_id: prepId, label: label.trim(), position }).select("id, label, done, position").single<ChecklistItem>();
}

export async function setChecklistItem(itemId: string, done: boolean) {
  return createClient().from("prep_checklist_items").update({ done }).eq("id", itemId);
}

export async function removeChecklistItem(itemId: string) {
  return createClient().from("prep_checklist_items").delete().eq("id", itemId);
}

export async function setTodayPoses(prepId: string, poses: string[]) {
  const supabase = createClient();
  if (!poses.length) return supabase.from("prep_pose_logs").delete().eq("prep_id", prepId).eq("practiced_on", localDate());
  return supabase.from("prep_pose_logs").upsert({ prep_id: prepId, practiced_on: localDate(), poses }, { onConflict: "prep_id,practiced_on" });
}

export async function getStudentPrepForCoach(studentId: string) {
  const { data } = await createClient().from("contest_preps").select("*").eq("student_id", studentId).eq("status", "active").order("stage_date").limit(1).maybeSingle();
  return data as ContestPrep | null;
}

// Results & ranking -----------------------------------------------------------

export async function getResults(athleteId: string) {
  const { data } = await createClient().from("competition_results").select("*").eq("athlete_id", athleteId).order("competed_on", { ascending: false });
  return (data ?? []) as CompetitionResult[];
}

export async function addResult(athleteId: string, input: { eventName: string; eventId?: string; federationCode: string; competedOn: string; state?: string; category: string; placement: number | null; isOverall: boolean; notes?: string }) {
  return createClient().from("competition_results").insert({
    athlete_id: athleteId,
    event_id: input.eventId || null,
    event_name: input.eventName.trim(),
    federation_code: input.federationCode,
    competed_on: input.competedOn,
    state: input.state || null,
    category: input.category.trim(),
    placement: input.placement,
    is_overall: input.isOverall,
    notes: input.notes?.trim() || null,
  });
}

export async function removeResult(resultId: string) {
  return createClient().from("competition_results").delete().eq("id", resultId);
}

export type RankingRow = { athlete: Author; points: number; podiums: number; titles: number; competitions: number };

export async function getRanking(year: number, federation?: string, state?: string) {
  const supabase = createClient();
  const { data } = await supabase.rpc("competition_ranking", { target_year: year, target_federation: federation || null, target_state: state || null });
  const rows = (data ?? []) as { athlete_id: string; points: number; podiums: number; titles: number; competitions: number }[];
  if (!rows.length) return [] as RankingRow[];
  const { data: profiles } = await supabase.from("social_profiles").select("id, display_name, avatar_path, frame, avatar_updated_at").in("id", rows.map(row => row.athlete_id));
  const byId = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  return rows.map(row => {
    const profile = byId.get(row.athlete_id);
    return {
      athlete: { id: row.athlete_id, name: profile?.display_name ?? "Atleta", avatarUrl: avatarUrl(profile?.avatar_path ?? null, profile?.avatar_updated_at), frame: profile?.frame ?? "none" },
      points: row.points, podiums: row.podiums, titles: row.titles, competitions: row.competitions,
    };
  });
}

export const placementLabel = (result: Pick<CompetitionResult, "placement" | "is_overall">) =>
  result.is_overall ? "Campeão overall" : result.placement ? `${result.placement}º lugar` : "Participação";
