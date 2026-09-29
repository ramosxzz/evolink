"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Share2, Sparkles, Trophy } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { AchievementBadge, tierStyles } from "@/components/social/achievement-badge";
import { FramedAvatar } from "@/components/social/framed-avatar";
import { Medal3D } from "@/components/social/medal-3d";
import { AnimatedNumber, ProgressBar, Reveal } from "@/components/ui/motion";
import type { Viewer } from "@/lib/evolink-data";
import { createPost, getAchievementCatalog, getMyAchievements, levelFor, type Achievement, type Frame } from "@/lib/social-data";
import { PageSkeleton } from "@/components/ui/skeleton";

const categories: { code: Achievement["category"]; title: string }[] = [
  { code: "treino", title: "Treino" },
  { code: "cardio", title: "Corrida e cardio" },
  { code: "consistencia", title: "Consistência" },
  { code: "evolucao", title: "Evolução" },
  { code: "comunidade", title: "Comunidade" },
];

// [singular, plural] unit per metric; km and kg keep decimals.
const metricUnits: Record<string, [string, string]> = {
  workouts_completed: ["treino", "treinos"],
  volume_kg: ["kg", "kg"],
  personal_records: ["recorde", "recordes"],
  run_days: ["dia correndo", "dias correndo"],
  longest_run_km: ["km", "km"],
  run_km_total: ["km", "km"],
  best_streak_days: ["dia seguido", "dias seguidos"],
  checkins_submitted: ["check-in", "check-ins"],
  progress_records: ["registro", "registros"],
  posts: ["post", "posts"],
  likes_received: ["curtida", "curtidas"],
};

function progressLabel(metric: string, value: number, threshold: number) {
  const [singular, plural] = metricUnits[metric] ?? ["", ""];
  const decimals = metric.endsWith("_km") ? 1 : 0;
  const format = (number: number) => number.toLocaleString("pt-BR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  return `${format(Math.min(value, threshold))} de ${format(threshold)} ${threshold === 1 ? singular : plural}`;
}

export function AchievementsPage({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [catalog, setCatalog] = useState<{ achievements: Achievement[]; frames: Frame[] } | null>(null);
  const [earned, setEarned] = useState<Map<string, string>>(new Map());
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [shared, setShared] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getAchievementCatalog(), getMyAchievements(viewer.id)]).then(([catalogResult, mine]) => {
      if (!active) return;
      setCatalog(catalogResult);
      setEarned(new Map(mine.earned.map(item => [item.code, item.earned_at])));
      setMetrics(mine.metrics);
    });
    return () => { active = false; };
  }, [viewer.id]);

  const points = useMemo(() => (catalog?.achievements ?? []).filter(item => earned.has(item.code)).reduce((total, item) => total + item.points, 0), [catalog, earned]);
  const level = levelFor(points);

  async function share(achievement: Achievement) {
    const { error } = await createPost(viewer.id, { caption: `Conquistei "${achievement.title}" no Evolink! 🏅`, files: [], visibility: "community", achievementCode: achievement.code });
    if (!error) setShared(achievement.code);
  }

  if (!catalog) return <Shell profile={viewer.role}><PageSkeleton tiles={3} /></Shell>;

  return (
    <Shell profile={viewer.role}>
      <PageTitle kicker="CONQUISTAS" title="Medalhas e nível" text="Cada treino, corrida e check-in conta. As medalhas desbloqueiam molduras para o seu perfil." />

      <Reveal index={0} className="relative mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#07352b] via-[#0a5a3e] to-[#087a50] p-6 text-white soft-shadow">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#b8e986]/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <motion.div initial={reduceMotion ? false : { rotate: -12, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="grid h-20 w-20 place-items-center rounded-3xl bg-white/15 text-3xl font-black">
            <AnimatedNumber value={level.level} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-[.14em] text-[#b8e986]">NÍVEL {level.level}</p>
            <p className="text-2xl font-bold"><AnimatedNumber value={points} /> pontos</p>
            <div className="mt-3 max-w-md"><ProgressBar value={level.progress} className="bg-[#b8e986]" track="bg-white/20" /></div>
            <p className="mt-1.5 text-xs text-emerald-100">{level.toNext} pontos para o próximo nível · {earned.size} de {catalog.achievements.length} medalhas</p>
          </div>
          <Button kind="soft" onClick={() => router.push(`/u/${viewer.id}`)} className="shrink-0"><Sparkles size={16} />Meu perfil</Button>
        </div>
      </Reveal>

      {earned.size > 0 && (
        <Reveal index={1} className="mt-6 overflow-hidden rounded-3xl border border-[#e2ece6] bg-[radial-gradient(circle_at_50%_0%,#ffffff_0%,#eef5f1_70%)] p-6 soft-shadow">
          <h2 className="font-bold">Vitrine</h2>
          <p className="text-xs text-[#71837b]">Passe o dedo ou o mouse sobre as medalhas.</p>
          <div className="mt-5 flex gap-6 overflow-x-auto pb-4 pt-2">
            {catalog.achievements
              .filter(item => earned.has(item.code))
              .sort((a, b) => (earned.get(b.code) ?? "").localeCompare(earned.get(a.code) ?? ""))
              .map(item => (
                <div key={item.code} className="flex shrink-0 flex-col items-center gap-3">
                  <Medal3D achievement={item} size="md" />
                  <p className="max-w-24 text-center text-xs font-bold leading-tight">{item.title}</p>
                </div>
              ))}
          </div>
        </Reveal>
      )}

      {categories.map((category, categoryIndex) => {
        const items = catalog.achievements.filter(item => item.category === category.code);
        if (!items.length) return null;
        return (
          <Reveal key={category.code} index={categoryIndex + 1} className="mt-6">
            <h2 className="font-bold">{category.title}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map(item => {
                const earnedAt = earned.get(item.code);
                const value = Number(metrics[item.metric] ?? 0);
                return (
                  <article key={item.code} className={`flex gap-4 rounded-3xl border bg-white p-4 soft-shadow transition ${earnedAt ? "border-[#e2ece6]" : "border-dashed border-[#dbe7e0]"}`}>
                    {earnedAt ? <span className="shrink-0"><Medal3D achievement={item} size="sm" ribbon={false} /></span> : <AchievementBadge achievement={item} earned={false} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold leading-tight">{item.title}</p>
                        <span className={`shrink-0 text-[10px] font-bold uppercase ${tierStyles[item.tier].text}`}>{tierStyles[item.tier].label}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#71837b]">{item.description}</p>
                      {earnedAt ? (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[#087a50]">+{item.points} pts · {new Date(earnedAt).toLocaleDateString("pt-BR")}</p>
                          <button onClick={() => share(item)} disabled={shared === item.code} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-[#087a50] hover:bg-[#eef6f1] disabled:text-[#91a39b]">
                            <Share2 size={12} />{shared === item.code ? "Publicado" : "Publicar"}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <ProgressBar value={value / item.threshold} />
                          <p className="mt-1 text-[11px] text-[#91a39b]">{progressLabel(item.metric, value, item.threshold)}</p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </Reveal>
        );
      })}

      <Reveal index={7} className="mt-8 rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow">
        <h2 className="flex items-center gap-2 font-bold"><Trophy size={18} className="text-[#d98a00]" />Molduras de perfil</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {catalog.frames.filter(frame => frame.code !== "none").map(frame => {
            const unlocked = !frame.required_achievement || earned.has(frame.required_achievement);
            const requirement = catalog.achievements.find(item => item.code === frame.required_achievement);
            return (
              <div key={frame.code} className={`flex flex-col items-center gap-2 rounded-2xl p-3 text-center ${unlocked ? "bg-[#f6fcf8]" : "bg-[#f7f9f8] opacity-60"}`}>
                <FramedAvatar author={{ name: viewer.fullName, avatarUrl: null, frame: frame.code }} size="md" />
                <p className="text-sm font-bold">{frame.title}</p>
                <p className="text-[11px] text-[#71837b]">{unlocked ? "Desbloqueada" : `Conquiste "${requirement?.title}"`}</p>
              </div>
            );
          })}
        </div>
      </Reveal>
    </Shell>
  );
}
