"use client";

import { buildDrafts } from "@/components/workout-logbook-page";
import { getProgress, getStudentDiet } from "@/lib/evolink-data";
import { getLogbook } from "@/lib/logbook-data";
import { hasCache, writeCache } from "@/lib/page-cache";
import { getStudentCardio, getStudentHabits } from "@/lib/wellness-data";

// Warms the page cache for the student's main tabs while the browser is idle,
// using the same keys the pages read, so the first visit opens without a skeleton.
export function prefetchStudentTabs(studentId: string) {
  const run = async () => {
    const tasks: Promise<unknown>[] = [];
    if (!hasCache(`diet:${studentId}`)) {
      tasks.push(getStudentDiet(studentId).then(result => {
        writeCache(`diet:${studentId}`, result);
        writeCache(`diet-done:${studentId}`, new Set(result.completedMealIds));
      }));
    }
    if (!hasCache(`cardio-plans:${studentId}`)) {
      tasks.push(getStudentCardio(studentId).then(result => {
        writeCache(`cardio-plans:${studentId}`, result.plans);
        writeCache(`cardio-logs:${studentId}`, result.logs);
      }));
    }
    if (!hasCache(`habit-goals:${studentId}`)) {
      tasks.push(getStudentHabits(studentId).then(result => {
        writeCache(`habit-goals:${studentId}`, result.goals);
        writeCache(`habit-logs:${studentId}`, result.logs);
      }));
    }
    if (!hasCache(`progress:${studentId}`)) {
      tasks.push(getProgress(studentId).then(rows => writeCache(`progress:${studentId}`, rows)));
    }
    const base = `logbook:${studentId}`;
    if (!hasCache(`${base}:loaded`)) {
      tasks.push(getLogbook(studentId).then(result => {
        if (result.error) return;
        const { drafts, expanded } = buildDrafts(result.exercises, result.activeSets, result.history);
        writeCache(`${base}:plans`, result.plans);
        writeCache(`${base}:suggested`, "suggestedPlanId" in result ? result.suggestedPlanId ?? null : null);
        writeCache(`${base}:plan`, result.plan);
        writeCache(`${base}:exercises`, result.exercises);
        writeCache(`${base}:history`, result.history);
        writeCache(`${base}:session`, result.session);
        writeCache(`${base}:drafts`, drafts);
        writeCache(`${base}:expanded`, expanded);
        writeCache(`${base}:loaded`, true);
      }));
    }
    await Promise.allSettled(tasks);
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(() => void run(), { timeout: 2500 });
  else setTimeout(() => void run(), 1200);
}
