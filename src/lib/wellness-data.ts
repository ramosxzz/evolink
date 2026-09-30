"use client";

import { addDays, localDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

export type CardioPlan = {
  id: string;
  title: string;
  modality: string;
  duration_minutes: number;
  sessions_per_week: number;
  intensity: string;
  intensity_detail: string | null;
  notes: string | null;
  status: "draft" | "published" | "archived";
};

export type CardioLog = {
  id: string;
  cardio_plan_id: string | null;
  modality: string | null;
  completed_at: string;
  duration_minutes: number;
  distance_km: number | null;
  perceived_exertion: number | null;
  note: string | null;
  source?: "manual" | "strava";
  external_id?: string | null;
  avg_heart_rate?: number | null;
};

export type HabitKind = "water" | "steps" | "sleep" | "cardio" | "supplement" | "custom";

export type HabitGoal = {
  id: string;
  kind: HabitKind;
  title: string;
  target_value: number | null;
  unit: string | null;
  instructions: string | null;
  active: boolean;
  position: number;
};

export type HabitLog = { id: string; habit_goal_id: string; logged_for: string; value: number | null; completed: boolean };

export const cardioModalities = ["Corrida", "Caminhada", "Bicicleta", "Esteira", "Elíptico", "Escada", "Natação", "Outro"] as const;

const planColumns = "id, title, modality, duration_minutes, sessions_per_week, intensity, intensity_detail, notes, status";
const logColumns = "id, cardio_plan_id, modality, completed_at, duration_minutes, distance_km, perceived_exertion, note, source, external_id, avg_heart_rate";
const goalColumns = "id, kind, title, target_value, unit, instructions, active, position";

// Student --------------------------------------------------------------------

export async function getStudentCardio(studentId: string) {
  const supabase = createClient();
  const [plans, logs] = await Promise.all([
    supabase.from("cardio_plans").select(planColumns).eq("student_id", studentId).eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("cardio_logs").select(logColumns).eq("student_id", studentId).gte("completed_at", addDays(-60).toISOString()).order("completed_at", { ascending: false }),
  ]);
  return { plans: (plans.data ?? []) as CardioPlan[], logs: (logs.data ?? []) as CardioLog[], error: plans.error ?? logs.error };
}

export async function logCardio(studentId: string, input: { planId?: string; modality: string; minutes: number; distanceKm?: number; exertion?: number; note?: string }) {
  return createClient()
    .from("cardio_logs")
    .insert({
      student_id: studentId,
      cardio_plan_id: input.planId ?? null,
      modality: input.modality,
      duration_minutes: input.minutes,
      distance_km: input.distanceKm ?? null,
      perceived_exertion: input.exertion ?? null,
      note: input.note?.trim() || null,
    })
    .select(logColumns)
    .single<CardioLog>();
}

export async function deleteCardioLog(logId: string) {
  return createClient().from("cardio_logs").delete().eq("id", logId);
}

export async function getStudentHabits(studentId: string) {
  const supabase = createClient();
  const [goals, logs] = await Promise.all([
    supabase.from("habit_goals").select(goalColumns).eq("student_id", studentId).eq("active", true).order("position").order("created_at"),
    supabase.from("habit_logs").select("id, habit_goal_id, logged_for, value, completed").eq("student_id", studentId).gte("logged_for", localDate(addDays(-6))),
  ]);
  return { goals: (goals.data ?? []) as HabitGoal[], logs: (logs.data ?? []) as HabitLog[], error: goals.error ?? logs.error };
}

export async function setHabitLog(studentId: string, goalId: string, values: { completed: boolean; value?: number | null }) {
  return createClient()
    .from("habit_logs")
    .upsert(
      { student_id: studentId, habit_goal_id: goalId, logged_for: localDate(), completed: values.completed, value: values.value ?? null },
      { onConflict: "habit_goal_id,student_id,logged_for" },
    )
    .select("id, habit_goal_id, logged_for, value, completed")
    .single<HabitLog>();
}

// Professional ----------------------------------------------------------------

export async function getStudentPrescriptions(professionalId: string, studentId: string) {
  const supabase = createClient();
  const [plans, goals] = await Promise.all([
    supabase.from("cardio_plans").select(planColumns).eq("professional_id", professionalId).eq("student_id", studentId).neq("status", "archived").order("created_at", { ascending: false }),
    supabase.from("habit_goals").select(goalColumns).eq("professional_id", professionalId).eq("student_id", studentId).eq("active", true).order("position").order("created_at"),
  ]);
  return { plans: (plans.data ?? []) as CardioPlan[], goals: (goals.data ?? []) as HabitGoal[], error: plans.error ?? goals.error };
}

export async function saveCardioPlan(professionalId: string, studentId: string, input: { title: string; modality: string; minutes: number; sessionsPerWeek: number; intensity: string; notes?: string }) {
  return createClient()
    .from("cardio_plans")
    .insert({
      professional_id: professionalId,
      student_id: studentId,
      title: input.title.trim(),
      modality: input.modality,
      duration_minutes: input.minutes,
      sessions_per_week: input.sessionsPerWeek,
      intensity: input.intensity,
      notes: input.notes?.trim() || null,
      status: "published",
      starts_on: localDate(),
    })
    .select(planColumns)
    .single<CardioPlan>();
}

export async function archiveCardioPlan(planId: string) {
  return createClient().from("cardio_plans").update({ status: "archived" }).eq("id", planId);
}

export async function saveHabitGoal(professionalId: string, studentId: string, input: { kind: HabitKind; title: string; target?: number; unit?: string; instructions?: string; position: number }) {
  return createClient()
    .from("habit_goals")
    .insert({
      professional_id: professionalId,
      student_id: studentId,
      kind: input.kind,
      title: input.title.trim(),
      target_value: input.target ?? null,
      unit: input.unit?.trim() || null,
      instructions: input.instructions?.trim() || null,
      position: input.position,
    })
    .select(goalColumns)
    .single<HabitGoal>();
}

export async function removeHabitGoal(goalId: string) {
  // Deactivate instead of delete, so past logs keep their history.
  return createClient().from("habit_goals").update({ active: false }).eq("id", goalId);
}

// Strava ---------------------------------------------------------------------

export type StravaStatus = { athleteName: string | null; connectedAt: string; lastSyncAt: string | null } | null;

export async function getStravaStatus(): Promise<StravaStatus> {
  const { data } = await createClient().rpc("my_strava_connection");
  const row = (data as { athlete_name: string | null; connected_at: string; last_sync_at: string | null }[] | null)?.[0];
  return row ? { athleteName: row.athlete_name, connectedAt: row.connected_at, lastSyncAt: row.last_sync_at } : null;
}

async function stravaRequest(path: string) {
  const { data: { session } } = await createClient().auth.getSession();
  const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
  const body = await response.json().catch(() => ({}));
  return response.ok ? { body, error: null } : { body, error: (body.error as string) ?? "Não foi possível falar com o Strava." };
}

/** Sends the student to Strava to authorize; Strava returns to /aluno/cardio. */
export async function connectStrava() {
  const { body, error } = await stravaRequest("/api/strava/connect");
  if (error || !body.url) return error ?? "Não foi possível conectar.";
  window.location.href = body.url as string;
  return null;
}

export const disconnectStrava = () => stravaRequest("/api/strava/disconnect");
