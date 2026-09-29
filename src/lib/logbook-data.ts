"use client";

import { createClient } from "@/lib/supabase/client";
import type { Viewer } from "@/lib/evolink-data";

export type LogbookExercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  sets: number | null;
  repetitions: string | null;
  rest_seconds: number | null;
  suggested_load: string | null;
  notes: string | null;
  video_url: string | null;
  technique: string | null;
  target_rir: number | null;
  target_rpe: number | null;
  position: number;
};

export type WorkoutSetLog = {
  id: string;
  workout_log_id: string | null;
  workout_exercise_id: string;
  set_number: number | null;
  repetitions_completed: number | null;
  load_kg: number | null;
  load_value: string | null;
  rir: number | null;
  rpe: number | null;
  rest_seconds: number | null;
  set_type: "warmup" | "working" | "drop" | "failure";
  is_personal_record: boolean;
  completed_at: string;
};

export type WorkoutSession = {
  id: string;
  student_id: string;
  workout_plan_id: string;
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_volume_kg: number;
  total_sets: number;
  pr_count: number;
};

export type WorkoutOption = { id: string; title: string; exerciseCount: number; lastCompletedAt: string | null; daysSinceCompleted: number | null };

/**
 * Students can have several published workouts (A/B/C). Pick the one with a
 * session in progress, else the requested one, else the one done longest ago.
 */
export async function getLogbook(studentId: string, requestedPlanId?: string) {
  const supabase = createClient();
  const empty = { plan: null, plans: [] as WorkoutOption[], exercises: [] as LogbookExercise[], session: null, activeSets: [] as WorkoutSetLog[], history: [] as WorkoutSetLog[] };
  const [{ data: plans, error: planError }, { data: recent }] = await Promise.all([
    supabase
      .from("workout_plans")
      .select("id, title, objective, estimated_minutes, created_at, workout_exercises(id, name, muscle_group, sets, repetitions, rest_seconds, suggested_load, notes, video_url, technique, target_rir, target_rpe, position)")
      .eq("student_id", studentId)
      .eq("status", "published")
      .order("title"),
    supabase
      .from("workout_logs")
      .select("workout_plan_id, status, completed_at")
      .eq("student_id", studentId)
      .order("started_at", { ascending: false })
      .limit(60),
  ]);

  if (planError) return { ...empty, error: planError };
  if (!plans?.length) return { ...empty, error: null };

  const lastCompleted = new Map<string, string>();
  for (const log of recent ?? []) if (log.status === "completed" && log.completed_at && !lastCompleted.has(log.workout_plan_id)) lastCompleted.set(log.workout_plan_id, log.completed_at);
  const daysSince = (date?: string) => (date ? Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000) : null);
  const options: WorkoutOption[] = plans.map(item => ({ id: item.id, title: item.title, exerciseCount: item.workout_exercises?.length ?? 0, lastCompletedAt: lastCompleted.get(item.id) ?? null, daysSinceCompleted: daysSince(lastCompleted.get(item.id)) }));
  const inProgress = (recent ?? []).find(log => log.status === "in_progress" && plans.some(item => item.id === log.workout_plan_id));
  const next = [...options].sort((a, b) => (a.lastCompletedAt ?? "").localeCompare(b.lastCompletedAt ?? ""))[0];
  const planId = inProgress?.workout_plan_id ?? (plans.some(item => item.id === requestedPlanId) ? requestedPlanId : next.id);
  const plan = plans.find(item => item.id === planId) ?? plans[0];

  const exercises = [...(plan.workout_exercises ?? [])]
    .sort((a, b) => a.position - b.position) as LogbookExercise[];
  const [{ data: activeSession, error: sessionError }, historyResult] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("id, student_id, workout_plan_id, status, started_at, completed_at, duration_seconds, total_volume_kg, total_sets, pr_count")
      .eq("student_id", studentId)
      .eq("workout_plan_id", plan.id)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    exercises.length
      ? supabase
          .from("workout_exercise_logs")
          .select("id, workout_log_id, workout_exercise_id, set_number, repetitions_completed, load_kg, load_value, rir, rpe, rest_seconds, set_type, is_personal_record, completed_at")
          .eq("student_id", studentId)
          .in("workout_exercise_id", exercises.map((exercise) => exercise.id))
          .order("completed_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const allLogs = (historyResult.data ?? []) as WorkoutSetLog[];
  const session = activeSession as WorkoutSession | null;
  return {
    plan: { id: plan.id, title: plan.title, objective: plan.objective, estimatedMinutes: plan.estimated_minutes },
    plans: options,
    suggestedPlanId: next.id,
    exercises,
    session,
    activeSets: session ? allLogs.filter((entry) => entry.workout_log_id === session.id) : [],
    history: session ? allLogs.filter((entry) => entry.workout_log_id !== session.id) : allLogs,
    error: sessionError ?? historyResult.error,
  };
}

export async function startWorkout(studentId: string, workoutPlanId: string) {
  return createClient()
    .from("workout_logs")
    .insert({ student_id: studentId, workout_plan_id: workoutPlanId, status: "in_progress", started_at: new Date().toISOString() })
    .select("id, student_id, workout_plan_id, status, started_at, completed_at, duration_seconds, total_volume_kg, total_sets, pr_count")
    .single();
}

export async function saveWorkoutSet(input: {
  studentId: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  repetitions: number;
  loadKg: number;
  rir?: number | null;
  setType: WorkoutSetLog["set_type"];
  restSeconds: number;
  isPersonalRecord: boolean;
}) {
  return createClient()
    .from("workout_exercise_logs")
    .upsert({
      student_id: input.studentId,
      workout_log_id: input.sessionId,
      workout_exercise_id: input.exerciseId,
      set_number: input.setNumber,
      repetitions_completed: input.repetitions,
      load_kg: input.loadKg,
      load_value: String(input.loadKg),
      rir: input.rir ?? null,
      rest_seconds: input.restSeconds,
      set_type: input.setType,
      is_personal_record: input.isPersonalRecord,
      completed_at: new Date().toISOString(),
    }, { onConflict: "workout_log_id,workout_exercise_id,set_number" })
    .select("id, workout_log_id, workout_exercise_id, set_number, repetitions_completed, load_kg, load_value, rir, rpe, rest_seconds, set_type, is_personal_record, completed_at")
    .single();
}

export async function removeWorkoutSet(sessionId: string, exerciseId: string, setNumber: number) {
  return createClient()
    .from("workout_exercise_logs")
    .delete()
    .eq("workout_log_id", sessionId)
    .eq("workout_exercise_id", exerciseId)
    .eq("set_number", setNumber);
}

export async function completeWorkout(input: {
  viewer: Viewer;
  session: WorkoutSession;
  workoutTitle: string;
  durationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  prCount: number;
  publish: boolean;
  visibility: "coach" | "community";
  caption: string;
  exerciseSummary: { name: string; sets: number; bestLoad: number }[];
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from("workout_logs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_seconds: input.durationSeconds,
      total_volume_kg: input.totalVolumeKg,
      total_sets: input.totalSets,
      pr_count: input.prCount,
    })
    .eq("id", input.session.id)
    .eq("student_id", input.viewer.id);
  if (error) return { error, postError: null };
  if (!input.publish) return { error: null, postError: null };

  // Every user already has a social profile (created by a database trigger).
  const { error: postError } = await supabase.from("social_posts").insert({
    author_id: input.viewer.id,
    workout_log_id: input.session.id,
    visibility: input.visibility,
    caption: input.caption.trim() || null,
    workout_title: input.workoutTitle,
    duration_seconds: input.durationSeconds,
    total_volume_kg: input.totalVolumeKg,
    total_sets: input.totalSets,
    pr_count: input.prCount,
    exercise_summary: input.exerciseSummary,
  });
  return { error: null, postError };
}

