"use client";

import { createClient } from "@/lib/supabase/client";

export type Viewer = {
  id: string;
  fullName: string;
  role: "student" | "professional";
  student?: { goal: string | null; targetWeightKg: number | null; waterGoalMl: number; accessStatus: "active" | "suspended"; suspensionReason: string | null };
  professionalId?: string;
  studentId?: string;
  counterpart?: { id: string; fullName: string };
};

export type Meal = {
  id: string;
  name: string;
  scheduled_time: string | null;
  notes: string | null;
  meal_items: { id: string; description: string; quantity: number | null; unit: string | null; substitutions: string[] }[];
};

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: number | null;
  repetitions: string | null;
  rest_seconds: number | null;
  suggested_load: string | null;
  notes: string | null;
  video_url: string | null;
  media_id: string | null;
};

function today() { return new Date().toISOString().slice(0, 10); }

export async function getViewer(): Promise<Viewer | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role").eq("id", user.id).single();
  if (!profile) return null;

  if (profile.role === "professional") {
    return { id: profile.id, fullName: profile.full_name, role: "professional", professionalId: profile.id };
  }

  const [{ data: student }, { data: relation }, { data: access }] = await Promise.all([
    supabase.from("student_profiles").select("goal, target_weight_kg, daily_water_goal_ml").eq("id", user.id).single(),
    supabase.from("professional_students").select("professional_id, professional_profiles(profiles(id, full_name))").eq("student_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from("student_profiles").select("access_status, suspension_reason").eq("id", user.id).maybeSingle(),
  ]);
  const rawProfile = (relation?.professional_profiles as unknown as { profiles: { id: string; full_name: string } | null } | null)?.profiles ?? null;
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: "student",
    studentId: profile.id,
    student: { goal: student?.goal ?? null, targetWeightKg: student?.target_weight_kg ?? null, waterGoalMl: student?.daily_water_goal_ml ?? 2500, accessStatus: access?.access_status === "suspended" ? "suspended" : "active", suspensionReason: access?.suspension_reason ?? null },
    counterpart: rawProfile ? { id: rawProfile.id, fullName: rawProfile.full_name } : undefined,
  };
}

export async function getStudentDiet(studentId: string) {
  const supabase = createClient();
  const { data: plan } = await supabase.from("diet_plans").select("id, title, notes, meals(id, name, scheduled_time, notes, meal_items(id, description, quantity, unit, substitutions))").eq("student_id", studentId).eq("status", "published").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!plan) return { plan: null, meals: [] as Meal[], completedMealIds: new Set<string>() };
  const { data: logs } = await supabase.from("meal_logs").select("meal_id").eq("student_id", studentId).eq("logged_for", today()).not("completed_at", "is", null);
  const meals = ((plan.meals ?? []) as Meal[]).sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""));
  return { plan, meals, completedMealIds: new Set((logs ?? []).map(log => log.meal_id)) };
}

export async function toggleMeal(studentId: string, mealId: string, completed: boolean) {
  const supabase = createClient();
  if (completed) return supabase.from("meal_logs").upsert({ student_id: studentId, meal_id: mealId, logged_for: today(), completed_at: new Date().toISOString() }, { onConflict: "student_id,meal_id,logged_for" });
  return supabase.from("meal_logs").upsert({ student_id: studentId, meal_id: mealId, logged_for: today(), completed_at: null }, { onConflict: "student_id,meal_id,logged_for" });
}

export async function getStudentWorkout(studentId: string) {
  const supabase = createClient();
  const { data: plan } = await supabase.from("workout_plans").select("id, title, objective, estimated_minutes, workout_exercises(id, name, sets, repetitions, rest_seconds, suggested_load, notes, video_url, media_id, position)").eq("student_id", studentId).eq("status", "published").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!plan) return { plan: null, exercises: [] as WorkoutExercise[], completedExerciseIds: new Set<string>() };
  const exerciseIds = (plan.workout_exercises ?? []).map(exercise => exercise.id);
  const { data: logs } = exerciseIds.length ? await supabase.from("workout_exercise_logs").select("workout_exercise_id").eq("student_id", studentId).gte("completed_at", `${today()}T00:00:00.000Z`) : { data: [] };
  return { plan, exercises: [...(plan.workout_exercises ?? [])].sort((a, b) => a.position - b.position) as WorkoutExercise[], completedExerciseIds: new Set((logs ?? []).map(log => log.workout_exercise_id)) };
}

export async function logExercise(studentId: string, exerciseId: string, loadValue?: string) {
  return createClient().from("workout_exercise_logs").insert({ student_id: studentId, workout_exercise_id: exerciseId, load_value: loadValue || null });
}

export async function getWaterToday(studentId: string) {
  const { data } = await createClient().from("water_logs").select("amount_ml").eq("student_id", studentId).gte("logged_at", `${today()}T00:00:00.000Z`);
  return (data ?? []).reduce((total, entry) => total + entry.amount_ml, 0);
}

export async function addWater(studentId: string, amountMl: number) {
  return createClient().from("water_logs").insert({ student_id: studentId, amount_ml: amountMl });
}

// Students talk to their linked professional; professionals pick the student.
export async function getMessages(viewer: Viewer, counterpartId = viewer.counterpart?.id) {
  if (!counterpartId) return [];
  const { data } = await createClient().from("messages").select("id, sender_id, recipient_id, body, created_at, read_at").or(`and(sender_id.eq.${viewer.id},recipient_id.eq.${counterpartId}),and(sender_id.eq.${counterpartId},recipient_id.eq.${viewer.id})`).order("created_at", { ascending: true }).limit(100);
  return data ?? [];
}

export async function sendMessage(viewer: Viewer, body: string, counterpartId = viewer.counterpart?.id) {
  if (!counterpartId || !body.trim()) return { data: null, error: new Error("Nenhum profissional ou aluno vinculado.") };
  return createClient().from("messages").insert({ sender_id: viewer.id, recipient_id: counterpartId, body: body.trim() }).select("id, sender_id, recipient_id, body, created_at").single();
}

export async function getNotifications(viewerId: string) {
  const { data } = await createClient().from("notifications").select("id, title, body, href, read_at, created_at").eq("recipient_id", viewerId).order("created_at", { ascending: false }).limit(20);
  return data ?? [];
}

export async function markNotificationsRead(viewerId: string) {
  return createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", viewerId).is("read_at", null);
}

export async function saveCheckin(viewer: Viewer, values: { nutrition: number; trainingDays: number; energy: number; weight?: number; message?: string }) {
  if (!viewer.studentId || !viewer.counterpart) return { error: new Error("Vincule um profissional antes de enviar o check-in.") };
  const date = new Date(); const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return createClient().from("check_ins").upsert({ student_id: viewer.studentId, professional_id: viewer.counterpart.id, week_of: monday.toISOString().slice(0, 10), nutrition_score: values.nutrition, training_days: values.trainingDays, energy_score: values.energy, current_weight_kg: values.weight ?? null, student_message: values.message ?? null, status: "submitted", submitted_at: new Date().toISOString() }, { onConflict: "student_id,week_of" });
}

export async function getProfessionalStudents(professionalId: string) {
  const supabase = createClient();
  const { data: relations, error } = await supabase
    .from("professional_students")
    .select("student_id, status")
    .eq("professional_id", professionalId)
    .eq("status", "active");
  if (error || !relations?.length) return [];
  const studentIds = relations.map(relation => relation.student_id);
  const [{ data: profiles }, { data: studentProfiles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, updated_at").in("id", studentIds),
    supabase.from("student_profiles").select("id, goal, target_weight_kg, initial_weight_kg, started_at, access_status, suspension_reason").in("id", studentIds),
  ]);
  return relations.map(relation => ({
    ...relation,
    profiles: profiles?.find(profile => profile.id === relation.student_id) ?? null,
    student_profiles: studentProfiles?.find(profile => profile.id === relation.student_id) ?? null,
  }));
}

export type FinanceRow = {
  paymentId: string;
  subscriptionId: string;
  studentId: string;
  studentName: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "waived";
  accessStatus: "active" | "suspended";
  autoSuspend: boolean;
  graceDays: number;
  paidAt: string | null;
  paymentMethod: string | null;
};

export type FinanceData = {
  rows: FinanceRow[];
  metrics: { expected: number; received: number; pending: number; overdue: number; suspended: number };
  error: Error | null;
};

function currentMonthRange() {
  const date = new Date();
  const start = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01` };
}

export async function getFinanceData(professionalId: string): Promise<FinanceData> {
  const supabase = createClient();
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("student_subscriptions")
    .select("id, student_id, amount, due_day, status, auto_suspend, grace_days")
    .eq("professional_id", professionalId)
    .neq("status", "cancelled");
  if (subscriptionError) return { rows: [], metrics: { expected: 0, received: 0, pending: 0, overdue: 0, suspended: 0 }, error: subscriptionError };
  if (!subscriptions?.length) return { rows: [], metrics: { expected: 0, received: 0, pending: 0, overdue: 0, suspended: 0 }, error: null };

  const subscriptionIds = subscriptions.map(item => item.id);
  const studentIds = [...new Set(subscriptions.map(item => item.student_id))];
  const [{ data: payments, error: paymentError }, { data: profiles, error: profileError }, { data: studentProfiles, error: accessError }] = await Promise.all([
    supabase.from("subscription_payments").select("id, subscription_id, due_date, amount, status, paid_at, payment_method").in("subscription_id", subscriptionIds).order("due_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name").in("id", studentIds),
    supabase.from("student_profiles").select("id, access_status").in("id", studentIds),
  ]);
  const error = paymentError ?? profileError ?? accessError;
  if (error) return { rows: [], metrics: { expected: 0, received: 0, pending: 0, overdue: 0, suspended: 0 }, error };

  const subscriptionById = new Map(subscriptions.map(item => [item.id, item]));
  const todayValue = today();
  const rows: FinanceRow[] = (payments ?? []).map(payment => {
    const subscription = subscriptionById.get(payment.subscription_id)!;
    const derivedStatus = payment.status === "pending" && payment.due_date < todayValue ? "overdue" : payment.status;
    return {
      paymentId: payment.id,
      subscriptionId: subscription.id,
      studentId: subscription.student_id,
      studentName: profiles?.find(profile => profile.id === subscription.student_id)?.full_name ?? "Aluno",
      amount: Number(payment.amount),
      dueDate: payment.due_date,
      status: derivedStatus as FinanceRow["status"],
      accessStatus: studentProfiles?.find(profile => profile.id === subscription.student_id)?.access_status === "suspended" ? "suspended" : "active",
      autoSuspend: subscription.auto_suspend,
      graceDays: subscription.grace_days,
      paidAt: payment.paid_at,
      paymentMethod: payment.payment_method,
    };
  });
  const { start, end } = currentMonthRange();
  const monthRows = rows.filter(row => row.dueDate >= start && row.dueDate < end && row.status !== "waived");
  return {
    rows,
    metrics: {
      expected: monthRows.reduce((sum, row) => sum + row.amount, 0),
      received: monthRows.filter(row => row.status === "paid").reduce((sum, row) => sum + row.amount, 0),
      pending: monthRows.filter(row => row.status === "pending").reduce((sum, row) => sum + row.amount, 0),
      overdue: monthRows.filter(row => row.status === "overdue").reduce((sum, row) => sum + row.amount, 0),
      suspended: new Set(rows.filter(row => row.accessStatus === "suspended").map(row => row.studentId)).size,
    },
    error: null,
  };
}

export async function createFinanceCharge(professionalId: string, values: { studentId: string; amount: number; dueDate: string; autoSuspend: boolean; graceDays: number }) {
  const supabase = createClient();
  const dueDay = Math.min(28, Math.max(1, Number(values.dueDate.slice(8, 10))));
  const { data: subscription, error: subscriptionError } = await supabase
    .from("student_subscriptions")
    .upsert({ professional_id: professionalId, student_id: values.studentId, amount: values.amount, due_day: dueDay, status: "active", auto_suspend: values.autoSuspend, grace_days: values.graceDays }, { onConflict: "professional_id,student_id" })
    .select("id")
    .single();
  if (subscriptionError || !subscription) return { error: subscriptionError ?? new Error("Não foi possível preparar a mensalidade.") };
  const { error } = await supabase.from("subscription_payments").upsert({ subscription_id: subscription.id, due_date: values.dueDate, amount: values.amount, status: "pending", paid_at: null, payment_method: null }, { onConflict: "subscription_id,due_date" });
  return { error };
}

export async function markFinancePaymentPaid(paymentId: string, method = "manual") {
  return createClient().from("subscription_payments").update({ status: "paid", paid_at: new Date().toISOString(), payment_method: method }).eq("id", paymentId);
}

export async function setStudentAccess(studentId: string, status: "active" | "suspended", reason?: string) {
  return createClient().rpc("set_linked_student_access", { target_student: studentId, new_status: status, reason: reason ?? null });
}

export async function sendPaymentReminder(professionalId: string, row: FinanceRow) {
  const due = new Date(`${row.dueDate}T12:00:00`).toLocaleDateString("pt-BR");
  return createClient().from("notifications").insert({
    recipient_id: row.studentId,
    actor_id: professionalId,
    kind: "payment",
    title: "Lembrete de mensalidade",
    body: `Sua mensalidade de R$ ${row.amount.toFixed(2).replace(".", ",")} vence em ${due}.`,
    href: "/aluno/perfil",
  });
}

export async function getProfessionalOverview(professionalId: string) {
  const [students, checkins, finance] = await Promise.all([
    getProfessionalStudents(professionalId),
    getProfessionalCheckins(professionalId),
    getFinanceData(professionalId),
  ]);
  const pendingCheckins = checkins.filter(item => item.status === "submitted");
  const attention = [
    ...pendingCheckins.slice(0, 5).map(item => ({ id: `checkin-${item.id}`, studentId: item.student_id, title: "Check-in aguardando resposta", detail: "Revisar respostas e enviar feedback", tone: "warning" as const })),
    ...finance.rows.filter(row => row.status === "overdue").slice(0, 5).map(row => ({ id: `payment-${row.paymentId}`, studentId: row.studentId, title: "Mensalidade em atraso", detail: `${row.studentName} · R$ ${row.amount.toFixed(2).replace(".", ",")}`, tone: "danger" as const })),
    ...finance.rows.filter(row => row.accessStatus === "suspended").slice(0, 5).map(row => ({ id: `access-${row.studentId}`, studentId: row.studentId, title: "Acesso suspenso", detail: row.studentName, tone: "danger" as const })),
  ].filter((item, index, all) => all.findIndex(other => other.id === item.id) === index).slice(0, 8);
  return { students, checkins, finance, pendingCheckins, attention };
}

export async function getProfessionalStudentDetail(professionalId: string, studentId: string) {
  const supabase = createClient();
  const { data: relation, error: relationError } = await supabase.from("professional_students").select("student_id, status, created_at").eq("professional_id", professionalId).eq("student_id", studentId).eq("status", "active").maybeSingle();
  if (relationError || !relation) return { data: null, error: relationError ?? new Error("Aluno não encontrado ou sem vínculo ativo.") };
  const [profile, student, diets, workouts, cardio, checkins, progress, notes, subscriptions, workoutHistory] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, updated_at").eq("id", studentId).single(),
    supabase.from("student_profiles").select("id, goal, started_at, initial_weight_kg, target_weight_kg, daily_water_goal_ml, access_status, suspension_reason").eq("id", studentId).single(),
    supabase.from("diet_plans").select("id, title, status, updated_at, meals(id)").eq("professional_id", professionalId).eq("student_id", studentId).order("updated_at", { ascending: false }).limit(1),
    supabase.from("workout_plans").select("id, title, objective, status, updated_at, workout_exercises(id)").eq("professional_id", professionalId).eq("student_id", studentId).order("updated_at", { ascending: false }).limit(1),
    supabase.from("cardio_plans").select("id, title, modality, duration_minutes, sessions_per_week, intensity, status, updated_at").eq("professional_id", professionalId).eq("student_id", studentId).order("updated_at", { ascending: false }).limit(1),
    supabase.from("check_ins").select("id, week_of, status, nutrition_score, training_days, energy_score, current_weight_kg, student_message, professional_feedback, submitted_at").eq("professional_id", professionalId).eq("student_id", studentId).order("week_of", { ascending: false }).limit(12),
    supabase.from("progress_records").select("id, recorded_on, weight_kg, note, progress_photos(id, storage_path, angle)").eq("student_id", studentId).order("recorded_on", { ascending: false }).limit(20),
    supabase.from("student_notes").select("id, body, is_private, created_at").eq("professional_id", professionalId).eq("student_id", studentId).order("created_at", { ascending: false }).limit(30),
    supabase.from("student_subscriptions").select("id, amount, status, auto_suspend, grace_days, subscription_payments(id, due_date, amount, status, paid_at)").eq("professional_id", professionalId).eq("student_id", studentId).limit(1),
    supabase.from("workout_logs").select("id, workout_plan_id, completed_at, duration_seconds, total_volume_kg, total_sets, pr_count, workout_plans(title)").eq("student_id", studentId).eq("status", "completed").order("completed_at", { ascending: false }).limit(20),
  ]);
  const error = profile.error ?? student.error ?? diets.error ?? workouts.error ?? cardio.error ?? checkins.error ?? progress.error ?? notes.error ?? subscriptions.error ?? workoutHistory.error;
  if (error) return { data: null, error };
  return { data: { relation, profile: profile.data, student: student.data, diet: diets.data?.[0] ?? null, workout: workouts.data?.[0] ?? null, cardio: cardio.data?.[0] ?? null, checkins: checkins.data ?? [], progress: progress.data ?? [], notes: notes.data ?? [], subscription: subscriptions.data?.[0] ?? null, workoutHistory: workoutHistory.data ?? [] }, error: null };
}

export async function addStudentNote(professionalId: string, studentId: string, body: string, isPrivate: boolean) {
  return createClient().from("student_notes").insert({ professional_id: professionalId, student_id: studentId, body: body.trim(), is_private: isPrivate });
}

export type CrmReminderKind = "weekly_feedback" | "workout_expiry" | "diet_expiry" | "cardio_expiry" | "payment" | "custom";
export type CrmReminderFrequency = "once" | "weekly" | "monthly";
export type CrmReminderRule = {
  id: string;
  professional_id: string;
  student_id: string;
  kind: CrmReminderKind;
  title: string;
  message: string;
  frequency: CrmReminderFrequency;
  target_date: string | null;
  weekday: number | null;
  day_of_month: number | null;
  send_time: string;
  timezone: string;
  next_run_at: string | null;
  last_run_at: string | null;
  active: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
  updated_at: string;
  studentName: string;
};

export type CrmReminderInput = {
  studentId: string;
  kind: CrmReminderKind;
  title: string;
  message: string;
  frequency: CrmReminderFrequency;
  targetDate: string;
  weekday: number;
  dayOfMonth: number;
  sendTime: string;
  active: boolean;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

export type CrmDelivery = {
  id: string;
  rule_id: string;
  recipient_id: string;
  scheduled_for: string;
  status: "sent" | "failed" | "cancelled";
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
};

export type CrmPlanDeadline = {
  id: string;
  studentId: string;
  studentName: string;
  kind: "workout_expiry" | "diet_expiry" | "cardio_expiry";
  title: string;
  endsOn: string;
};

function crmNextRun(input: Pick<CrmReminderInput, "frequency" | "targetDate" | "weekday" | "dayOfMonth" | "sendTime">) {
  const [hours, minutes] = input.sendTime.split(":").map(Number);
  const now = new Date();
  if (input.frequency === "once") return new Date(`${input.targetDate}T${input.sendTime}:00`).toISOString();
  if (input.frequency === "weekly") {
    const next = new Date(now); next.setSeconds(0, 0); next.setHours(hours, minutes, 0, 0);
    let days = (input.weekday - next.getDay() + 7) % 7;
    if (days === 0 && next <= now) days = 7;
    next.setDate(next.getDate() + days); return next.toISOString();
  }
  const next = new Date(now.getFullYear(), now.getMonth(), input.dayOfMonth, hours, minutes, 0, 0);
  if (next <= now) next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

export async function getCrmData(professionalId: string) {
  const supabase = createClient();
  const students = await getProfessionalStudents(professionalId);
  const studentIds = students.map(item => item.student_id);
  const [{ data: rules, error: rulesError }, workoutPlans, dietPlans, cardioPlans] = await Promise.all([
    supabase.from("crm_reminder_rules").select("id, professional_id, student_id, kind, title, message, frequency, target_date, weekday, day_of_month, send_time, timezone, next_run_at, last_run_at, active, related_entity_type, related_entity_id, created_at, updated_at").eq("professional_id", professionalId).order("next_run_at", { ascending: true, nullsFirst: false }),
    studentIds.length ? supabase.from("workout_plans").select("id, student_id, title, ends_on").eq("professional_id", professionalId).eq("status", "published").not("ends_on", "is", null) : Promise.resolve({ data: [], error: null }),
    studentIds.length ? supabase.from("diet_plans").select("id, student_id, title, ends_on").eq("professional_id", professionalId).eq("status", "published").not("ends_on", "is", null) : Promise.resolve({ data: [], error: null }),
    studentIds.length ? supabase.from("cardio_plans").select("id, student_id, title, ends_on").eq("professional_id", professionalId).eq("status", "published").not("ends_on", "is", null) : Promise.resolve({ data: [], error: null }),
  ]);
  const ruleIds = (rules ?? []).map(rule => rule.id);
  const { data: deliveries, error: deliveryError } = ruleIds.length
    ? await supabase.from("crm_reminder_deliveries").select("id, rule_id, recipient_id, scheduled_for, status, sent_at, error_message, created_at").in("rule_id", ruleIds).order("created_at", { ascending: false }).limit(100)
    : { data: [], error: null };
  const nameFor = (studentId: string) => (students.find(item => item.student_id === studentId)?.profiles as { full_name?: string } | null)?.full_name ?? "Aluno";
  const enrichedRules = (rules ?? []).map(rule => ({ ...rule, studentName: nameFor(rule.student_id) })) as CrmReminderRule[];
  const deadlines: CrmPlanDeadline[] = [
    ...(workoutPlans.data ?? []).map(plan => ({ id: plan.id, studentId: plan.student_id, studentName: nameFor(plan.student_id), kind: "workout_expiry" as const, title: plan.title, endsOn: plan.ends_on! })),
    ...(dietPlans.data ?? []).map(plan => ({ id: plan.id, studentId: plan.student_id, studentName: nameFor(plan.student_id), kind: "diet_expiry" as const, title: plan.title, endsOn: plan.ends_on! })),
    ...(cardioPlans.data ?? []).map(plan => ({ id: plan.id, studentId: plan.student_id, studentName: nameFor(plan.student_id), kind: "cardio_expiry" as const, title: plan.title, endsOn: plan.ends_on! })),
  ].sort((a, b) => a.endsOn.localeCompare(b.endsOn));
  return { students, rules: enrichedRules, deliveries: (deliveries ?? []) as CrmDelivery[], deadlines, error: rulesError ?? deliveryError ?? workoutPlans.error ?? dietPlans.error ?? cardioPlans.error };
}

export async function saveCrmReminder(professionalId: string, input: CrmReminderInput, ruleId?: string) {
  const supabase = createClient();
  const payload = {
    professional_id: professionalId,
    student_id: input.studentId,
    kind: input.kind,
    title: input.title.trim(),
    message: input.message.trim(),
    frequency: input.frequency,
    target_date: input.frequency === "once" ? input.targetDate : null,
    weekday: input.frequency === "weekly" ? input.weekday : null,
    day_of_month: input.frequency === "monthly" ? input.dayOfMonth : null,
    send_time: input.sendTime,
    timezone: "America/Sao_Paulo",
    next_run_at: crmNextRun(input),
    active: input.active,
    related_entity_type: input.relatedEntityType ?? null,
    related_entity_id: input.relatedEntityId ?? null,
  };
  if (ruleId) return supabase.from("crm_reminder_rules").update(payload).eq("id", ruleId).eq("professional_id", professionalId);
  return supabase.from("crm_reminder_rules").insert(payload);
}

export async function toggleCrmReminder(rule: CrmReminderRule, active: boolean) {
  const nextRun = active ? crmNextRun({ frequency: rule.frequency, targetDate: rule.target_date ?? today(), weekday: rule.weekday ?? 1, dayOfMonth: rule.day_of_month ?? 1, sendTime: rule.send_time.slice(0, 5) }) : rule.next_run_at;
  return createClient().from("crm_reminder_rules").update({ active, next_run_at: nextRun }).eq("id", rule.id).eq("professional_id", rule.professional_id);
}

export async function deleteCrmReminder(professionalId: string, ruleId: string) {
  return createClient().from("crm_reminder_rules").delete().eq("id", ruleId).eq("professional_id", professionalId);
}

export async function sendCrmReminderNow(rule: CrmReminderRule) {
  const supabase = createClient();
  const kind = rule.kind === "weekly_feedback" ? "checkin" : rule.kind === "workout_expiry" ? "workout" : rule.kind === "diet_expiry" ? "diet" : rule.kind === "cardio_expiry" ? "cardio" : rule.kind === "payment" ? "payment" : "system";
  const href = rule.kind === "weekly_feedback" ? "/aluno/check-in" : rule.kind === "workout_expiry" ? "/aluno/treino" : rule.kind === "diet_expiry" ? "/aluno/dieta" : rule.kind === "cardio_expiry" ? "/aluno/cardio" : rule.kind === "payment" ? "/aluno/perfil" : "/aluno";
  const { error } = await supabase.from("notifications").insert({ recipient_id: rule.student_id, actor_id: rule.professional_id, kind, title: rule.title, body: rule.message, href });
  if (error) return { error };
  const sentAt = new Date().toISOString();
  const { error: deliveryError } = await supabase.from("crm_reminder_deliveries").insert({ rule_id: rule.id, recipient_id: rule.student_id, scheduled_for: sentAt, status: "sent", sent_at: sentAt });
  return { error: deliveryError };
}

export async function getProfessionalCheckins(professionalId: string) {
  const { data } = await createClient().from("check_ins").select("id, student_id, status, nutrition_score, training_days, energy_score, current_weight_kg, student_message, professional_feedback, submitted_at, student_profiles(profiles(full_name))").eq("professional_id", professionalId).in("status", ["submitted", "reviewed"]).order("submitted_at", { ascending: false }).limit(50);
  return (data ?? []).map(({ student_profiles, ...row }) => ({ ...row, profiles: (student_profiles as unknown as { profiles: { full_name: string } | null } | null)?.profiles ?? null }));
}

export async function reviewCheckin(checkinId: string, feedback: string) {
  return createClient().from("check_ins").update({ status: "reviewed", professional_feedback: feedback, reviewed_at: new Date().toISOString() }).eq("id", checkinId);
}

export async function createProfessionalInvite(professionalId: string) {
  const { data, error } = await createClient().from("professional_invites").insert({ professional_id: professionalId }).select("token, expires_at").single();
  return { data, error };
}

export async function redeemProfessionalInvite(token: string) {
  const { data: { session } } = await createClient().auth.getSession();
  const response = await fetch("/api/invites/redeem", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` }, body: JSON.stringify({ inviteToken: token }) });
  const body = await response.json().catch(() => ({}));
  return { error: response.ok ? null : new Error(body.error ?? "Não foi possível aceitar o convite.") };
}

export async function publishWorkout(professionalId: string, studentId: string, values: { title: string; objective: string; minutes: number; endsOn?: string; exercises: { name: string; sets: number; repetitions: string; restSeconds: number; videoUrl?: string }[] }) {
  const supabase = createClient();
  const { data: plan, error } = await supabase.from("workout_plans").insert({ professional_id: professionalId, student_id: studentId, title: values.title, objective: values.objective || null, estimated_minutes: values.minutes || null, status: "published", starts_on: today(), ends_on: values.endsOn || null }).select("id").single();
  if (error || !plan) return { error: error ?? new Error("Não foi possível criar o treino.") };
  const { error: exerciseError } = await supabase.from("workout_exercises").insert(values.exercises.map((exercise, position) => ({ workout_plan_id: plan.id, name: exercise.name, sets: exercise.sets, repetitions: exercise.repetitions, rest_seconds: exercise.restSeconds, video_url: exercise.videoUrl || null, position })));
  return { error: exerciseError };
}

export async function publishDiet(professionalId: string, studentId: string, values: { title: string; notes: string; endsOn?: string; meals: { name: string; time: string; items: string[] }[] }) {
  const supabase = createClient();
  const { data: plan, error } = await supabase.from("diet_plans").insert({ professional_id: professionalId, student_id: studentId, title: values.title, notes: values.notes || null, status: "published", starts_on: today(), ends_on: values.endsOn || null }).select("id").single();
  if (error || !plan) return { error: error ?? new Error("Não foi possível criar a dieta.") };
  for (const [position, meal] of values.meals.entries()) {
    const { data: createdMeal, error: mealError } = await supabase.from("meals").insert({ diet_plan_id: plan.id, name: meal.name, scheduled_time: meal.time || null, position }).select("id").single();
    if (mealError || !createdMeal) return { error: mealError ?? new Error("Não foi possível criar uma refeição.") };
    if (meal.items.length) { const { error: itemsError } = await supabase.from("meal_items").insert(meal.items.map((description, itemPosition) => ({ meal_id: createdMeal.id, description, position: itemPosition }))); if (itemsError) return { error: itemsError }; }
  }
  return { error: null };
}

export async function getProgress(studentId: string) {
  const { data } = await createClient().from("progress_records").select("id, recorded_on, weight_kg, note, progress_photos(id, storage_path, angle)").eq("student_id", studentId).order("recorded_on", { ascending: false }).limit(30);
  return data ?? [];
}

export async function addProgressRecord(studentId: string, weight: number, note: string, photo?: File) {
  const supabase = createClient();
  const { data: record, error } = await supabase.from("progress_records").upsert({ student_id: studentId, recorded_on: today(), weight_kg: weight, note: note || null }, { onConflict: "student_id,recorded_on" }).select("id").single();
  if (error || !record || !photo) return { error };
  const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${studentId}/${record.id}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("progress-media").upload(path, photo, { contentType: photo.type, upsert: false });
  if (uploadError) return { error: uploadError };
  return supabase.from("progress_photos").insert({ student_id: studentId, progress_record_id: record.id, storage_path: path, angle: "front" });
}

export type WorkoutTemplateContent = {
  objective: string;
  estimatedMinutes: number;
  exercises: { name: string; sets: number; repetitions: string; restSeconds: number }[];
};

export type DietTemplateContent = {
  notes: string;
  meals: { name: string; time: string; items: string[] }[];
};

export type PlanTemplate = {
  id: string;
  professional_id: string;
  kind: "workout" | "diet";
  title: string;
  description: string | null;
  content: WorkoutTemplateContent | DietTemplateContent;
  use_count: number;
  created_at: string;
  updated_at: string;
};

export type PlanTemplateInput = Pick<PlanTemplate, "kind" | "title" | "description" | "content">;

export async function getPlanTemplates(professionalId: string) {
  const { data, error } = await createClient()
    .from("plan_templates")
    .select("id, professional_id, kind, title, description, content, use_count, created_at, updated_at")
    .eq("professional_id", professionalId)
    .order("updated_at", { ascending: false });
  return { data: (data ?? []) as PlanTemplate[], error };
}

export async function savePlanTemplate(professionalId: string, values: PlanTemplateInput, templateId?: string) {
  const supabase = createClient();
  const payload = {
    professional_id: professionalId,
    kind: values.kind,
    title: values.title.trim(),
    description: values.description?.trim() || null,
    content: values.content,
  };
  if (templateId) {
    return supabase
      .from("plan_templates")
      .update(payload)
      .eq("id", templateId)
      .eq("professional_id", professionalId)
      .select("id, professional_id, kind, title, description, content, use_count, created_at, updated_at")
      .single();
  }
  return supabase
    .from("plan_templates")
    .insert(payload)
    .select("id, professional_id, kind, title, description, content, use_count, created_at, updated_at")
    .single();
}

export async function deletePlanTemplate(professionalId: string, templateId: string) {
  return createClient()
    .from("plan_templates")
    .delete()
    .eq("id", templateId)
    .eq("professional_id", professionalId);
}

export async function applyPlanTemplate(template: PlanTemplate, studentId: string) {
  const result = template.kind === "workout"
    ? await publishWorkout(template.professional_id, studentId, {
        title: template.title,
        objective: (template.content as WorkoutTemplateContent).objective,
        minutes: (template.content as WorkoutTemplateContent).estimatedMinutes,
        exercises: (template.content as WorkoutTemplateContent).exercises.map(exercise => ({
          name: exercise.name,
          sets: exercise.sets,
          repetitions: exercise.repetitions,
          restSeconds: exercise.restSeconds,
        })),
      })
    : await publishDiet(template.professional_id, studentId, {
        title: template.title,
        notes: (template.content as DietTemplateContent).notes,
        meals: (template.content as DietTemplateContent).meals,
      });
  if (result.error) return result;
  await createClient()
    .from("plan_templates")
    .update({ use_count: template.use_count + 1 })
    .eq("id", template.id)
    .eq("professional_id", template.professional_id);
  return { error: null };
}

export type PublishedProtocol = {
  id: string;
  kind: "workout" | "diet";
  title: string;
  studentName: string;
  updatedAt: string;
  content: WorkoutTemplateContent | DietTemplateContent;
};

export async function getPublishedProtocols(professionalId: string): Promise<{ data: PublishedProtocol[]; error: Error | null }> {
  const supabase = createClient();
  const [workouts, diets] = await Promise.all([
    supabase
      .from("workout_plans")
      .select("id, title, objective, estimated_minutes, student_id, updated_at, workout_exercises(name, sets, repetitions, rest_seconds, position)")
      .eq("professional_id", professionalId)
      .eq("status", "published")
      .order("updated_at", { ascending: false }),
    supabase
      .from("diet_plans")
      .select("id, title, notes, student_id, updated_at, meals(name, scheduled_time, position, meal_items(description, position))")
      .eq("professional_id", professionalId)
      .eq("status", "published")
      .order("updated_at", { ascending: false }),
  ]);
  const studentIds = [...new Set([...(workouts.data ?? []).map(row => row.student_id), ...(diets.data ?? []).map(row => row.student_id)])];
  const { data: studentProfiles, error: studentProfilesError } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [], error: null };
  const profileName = (studentId: string) => studentProfiles?.find(profile => profile.id === studentId)?.full_name ?? "Aluno";
  const firstError = workouts.error ?? diets.error ?? studentProfilesError;
  if (firstError) return { data: [], error: firstError };
  const workoutRows = (workouts.data ?? []).map(row => ({
    id: row.id,
    kind: "workout" as const,
    title: row.title,
    studentName: profileName(row.student_id),
    updatedAt: row.updated_at,
    content: {
      objective: row.objective ?? "",
      estimatedMinutes: row.estimated_minutes ?? 45,
      exercises: [...(row.workout_exercises ?? [])]
        .sort((a, b) => a.position - b.position)
        .map(exercise => ({
          name: exercise.name,
          sets: exercise.sets ?? 3,
          repetitions: exercise.repetitions ?? "10-12",
          restSeconds: exercise.rest_seconds ?? 60,
        })),
    },
  }));
  const dietRows = (diets.data ?? []).map(row => ({
    id: row.id,
    kind: "diet" as const,
    title: row.title,
    studentName: profileName(row.student_id),
    updatedAt: row.updated_at,
    content: {
      notes: row.notes ?? "",
      meals: [...(row.meals ?? [])]
        .sort((a, b) => a.position - b.position)
        .map(meal => ({
          name: meal.name,
          time: meal.scheduled_time?.slice(0, 5) ?? "",
          items: [...(meal.meal_items ?? [])]
            .sort((a, b) => a.position - b.position)
            .map(item => item.description),
        })),
    },
  }));
  return { data: [...workoutRows, ...dietRows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), error: null };
}

export async function getProfessionalSettings(professionalId: string) {
  const supabase = createClient();
  const [{ data: profile, error: profileError }, { data: professional, error: professionalError }, { data: preferences, error: preferencesError }, { data: auth }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", professionalId).single(),
    supabase.from("professional_profiles").select("specialty, registration_number, bio").eq("id", professionalId).single(),
    supabase.from("notification_preferences").select("plan_update_notifications, checkin_reminders, quiet_hours_start, quiet_hours_end, timezone").eq("user_id", professionalId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  return { profile, professional, preferences, email: auth.user?.email ?? "", error: profileError ?? professionalError ?? preferencesError };
}

export async function saveProfessionalSettings(professionalId: string, values: {
  fullName: string;
  phone: string;
  specialty: string;
  registrationNumber: string;
  bio: string;
  planUpdateNotifications: boolean;
  checkinReminders: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}) {
  const supabase = createClient();
  const [profile, professional, preferences] = await Promise.all([
    supabase.from("profiles").update({ full_name: values.fullName.trim(), phone: values.phone.trim() || null }).eq("id", professionalId),
    supabase.from("professional_profiles").update({ specialty: values.specialty.trim() || null, registration_number: values.registrationNumber.trim() || null, bio: values.bio.trim() || null }).eq("id", professionalId),
    supabase.from("notification_preferences").upsert({
      user_id: professionalId,
      plan_update_notifications: values.planUpdateNotifications,
      checkin_reminders: values.checkinReminders,
      quiet_hours_start: values.quietHoursStart || null,
      quiet_hours_end: values.quietHoursEnd || null,
      timezone: "America/Sao_Paulo",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }),
  ]);
  return { error: profile.error ?? professional.error ?? preferences.error };
}

export async function getProfessionalLibrary(professionalId: string) {
  const supabase = createClient();
  const [foods, plans] = await Promise.all([
    supabase.from("foods").select("id, name, category, serving_description, calories, protein_g, carbohydrates_g, fat_g").order("name"),
    supabase.from("workout_plans").select("workout_exercises(id, name, muscle_group, video_url, notes)").eq("professional_id", professionalId),
  ]);
  const exercises = (plans.data ?? []).flatMap(plan => plan.workout_exercises ?? []);
  const uniqueExercises = [...new Map(exercises.map(exercise => [exercise.name.toLocaleLowerCase("pt-BR"), exercise])).values()];
  return { foods: foods.data ?? [], exercises: uniqueExercises, error: foods.error ?? plans.error };
}
