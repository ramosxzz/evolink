"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { Medal3D } from "@/components/social/medal-3d";
import { getAchievementCatalog, type Achievement } from "@/lib/social-data";
import { createClient } from "@/lib/supabase/client";

const confettiColors = ["#b8e986", "#087a50", "#ffcc33", "#7de2ff", "#ff6a00", "#ffffff"];

/**
 * Listens for "Nova conquista" notifications (created by the achievements
 * trigger) and celebrates them on screen.
 */
export function AchievementCelebration({ userId }: { userId: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [catalog, setCatalog] = useState<Achievement[]>([]);
  const [queue, setQueue] = useState<Achievement[]>([]);

  useEffect(() => {
    let active = true;
    getAchievementCatalog().then(result => { if (active) setCatalog(result.achievements); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!catalog.length) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`achievements:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, payload => {
        const row = payload.new as { title: string; href: string | null };
        if (row.href !== "/conquistas") return;
        const title = row.title.replace(/^Nova conquista: /, "");
        const achievement = catalog.find(item => item.title === title);
        if (achievement) setQueue(current => (current.some(item => item.code === achievement.code) ? current : [...current, achievement]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [catalog, userId]);

  const current = queue[0];
  const close = () => setQueue(items => items.slice(1));

  return (
    <AnimatePresence>
      {current && (
        <motion.div key={current.code} className="fixed inset-0 z-[60] grid place-items-center bg-[#041f19]/70 p-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          {!reduceMotion && Array.from({ length: 28 }, (_, index) => (
            <motion.span
              key={index}
              className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-1.5 rounded-sm"
              style={{ background: confettiColors[index % confettiColors.length] }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: Math.cos((index / 28) * Math.PI * 2) * (180 + (index % 5) * 30), y: Math.sin((index / 28) * Math.PI * 2) * (180 + (index % 4) * 35) + 120, rotate: index * 47, opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
            />
          ))}
          <motion.div
            onClick={event => event.stopPropagation()}
            initial={reduceMotion ? false : { scale: 0.6, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-2xl"
          >
            <button onClick={close} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#91a39b] hover:bg-[#f3f8f5]"><X size={17} /></button>
            <div className="mx-auto -mt-2 w-fit">
              <Medal3D achievement={current} size="lg" spin />
            </div>
            <p className="mt-5 text-xs font-bold tracking-[.18em] text-[#d98a00]">NOVA CONQUISTA</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{current.title}</h2>
            <p className="mt-2 text-sm text-[#71837b]">{current.description}</p>
            <p className="mt-3 text-sm font-bold text-[#087a50]">+{current.points} pontos</p>
            <div className="mt-6 flex flex-col gap-2">
              <button onClick={() => { close(); router.push("/conquistas"); }} className="rounded-xl bg-[#087a50] px-5 py-3 text-sm font-bold text-white hover:bg-[#066a45]">Ver minhas conquistas</button>
              <button onClick={close} className="rounded-xl border border-[#dbe7e0] px-5 py-3 text-sm font-bold text-[#285248] hover:bg-[#f3f8f5]">Continuar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
