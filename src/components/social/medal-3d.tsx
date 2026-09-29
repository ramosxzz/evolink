"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { achievementIcons } from "@/components/social/achievement-badge";
import type { Achievement } from "@/lib/social-data";

type Metal = { face: string; rim: string; edge: string; ribbon: [string, string]; ink: string };

const metals: Record<Achievement["tier"], Metal> = {
  bronze: {
    face: "radial-gradient(circle at 32% 28%, #ffd9b0 0%, #e39a5b 28%, #b3652c 58%, #7a3f16 100%)",
    rim: "conic-gradient(from 210deg, #7a3f16, #f3b27a, #8e4a1d, #ffcf9c, #7a3f16)",
    edge: "#6b3512",
    ribbon: ["#c0392b", "#8e1f14"],
    ink: "#5a2a0c",
  },
  prata: {
    face: "radial-gradient(circle at 32% 28%, #ffffff 0%, #dfe5ea 30%, #a9b4bd 62%, #6f7b85 100%)",
    rim: "conic-gradient(from 210deg, #6f7b85, #ffffff, #8d99a3, #f2f5f7, #6f7b85)",
    edge: "#5d6871",
    ribbon: ["#2b6cb0", "#1a4378"],
    ink: "#3b464f",
  },
  ouro: {
    face: "radial-gradient(circle at 32% 28%, #fff8d6 0%, #ffd84d 26%, #d9a300 58%, #8f6400 100%)",
    rim: "conic-gradient(from 210deg, #8f6400, #fff1a8, #b98900, #ffe680, #8f6400)",
    edge: "#7a5500",
    ribbon: ["#087a50", "#05482f"],
    ink: "#5c4100",
  },
  diamante: {
    face: "radial-gradient(circle at 32% 28%, #ffffff 0%, #c9f3ff 24%, #9fb7ff 52%, #6a5acd 100%)",
    rim: "conic-gradient(from 210deg, #6a5acd, #e0f7ff, #7de2ff, #d7c8ff, #6a5acd)",
    edge: "#4b3fa8",
    ribbon: ["#6a1b9a", "#3d0f5a"],
    ink: "#2c2470",
  },
};

const sizes = { sm: 56, md: 88, lg: 150 } as const;

/**
 * Metallic medal with real depth: stacked discs form the coin edge, so it
 * reads as a solid object when it tilts or spins.
 */
export function Medal3D({
  achievement,
  size = "md",
  spin = false,
  interactive = true,
  ribbon = true,
}: {
  achievement: Pick<Achievement, "icon" | "tier" | "title">;
  size?: keyof typeof sizes;
  spin?: boolean;
  interactive?: boolean;
  ribbon?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const metal = metals[achievement.tier];
  const Icon = achievementIcons[achievement.icon] ?? achievementIcons.medal;
  const diameter = sizes[size];
  const thickness = Math.max(4, Math.round(diameter / 14));
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-28, 28]), { stiffness: 180, damping: 16 });
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [22, -22]), { stiffness: 180, damping: 16 });
  const glareX = useTransform(pointerX, [-0.5, 0.5], ["20%", "80%"]);
  const canTilt = interactive && !reduceMotion && !spin;

  function track(event: React.PointerEvent<HTMLDivElement>) {
    if (!canTilt) return;
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  }

  function reset() {
    pointerX.set(0);
    pointerY.set(0);
  }

  const face = (back = false) => (
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: metal.rim,
        transform: back ? `rotateY(180deg) translateZ(${thickness / 2}px)` : `translateZ(${thickness / 2}px)`,
        backfaceVisibility: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.35)",
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          inset: diameter * 0.09,
          background: metal.face,
          boxShadow: `inset 0 ${diameter * 0.03}px ${diameter * 0.05}px rgba(255,255,255,.55), inset 0 -${diameter * 0.04}px ${diameter * 0.07}px rgba(0,0,0,.35), 0 0 0 1px rgba(0,0,0,.12)`,
        }}
      />
      <div className="absolute inset-0 grid place-items-center" style={{ color: metal.ink, filter: "drop-shadow(0 1px 0 rgba(255,255,255,.7)) drop-shadow(0 -1px 0 rgba(0,0,0,.35))" }}>
        <Icon size={diameter * 0.38} strokeWidth={2.4} />
      </div>
      {!back && (
        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full mix-blend-overlay"
          style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,.85) 48%, transparent 62%)", backgroundSize: "250% 100%", backgroundPositionX: canTilt ? glareX : undefined }}
          animate={canTilt || reduceMotion ? undefined : { backgroundPositionX: ["120%", "-20%"] }}
          transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
        />
      )}
    </div>
  );

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: diameter }}>
      {ribbon && (
        <div className="relative -mb-2 flex justify-center" style={{ height: diameter * 0.42 }} aria-hidden>
          <span className="block origin-bottom -rotate-12" style={{ width: diameter * 0.26, height: "100%", background: `linear-gradient(90deg, ${metal.ribbon[0]} 0 40%, #f5f5f5 40% 60%, ${metal.ribbon[0]} 60%)`, clipPath: "polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)", boxShadow: "inset -3px 0 6px rgba(0,0,0,.25)" }} />
          <span className="-ml-1 block origin-bottom rotate-12" style={{ width: diameter * 0.26, height: "100%", background: `linear-gradient(90deg, ${metal.ribbon[1]} 0 40%, #e5e5e5 40% 60%, ${metal.ribbon[1]} 60%)`, clipPath: "polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)", boxShadow: "inset 3px 0 6px rgba(0,0,0,.25)" }} />
        </div>
      )}
      <div
        onPointerMove={track}
        onPointerLeave={reset}
        className="relative"
        style={{ width: diameter, height: diameter, perspective: diameter * 5 }}
        role="img"
        aria-label={`Medalha ${achievement.title}`}
      >
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: "preserve-3d", rotateX: canTilt ? rotateX : 0, rotateY: canTilt ? rotateY : undefined }}
          animate={spin && !reduceMotion ? { rotateY: [0, 720, 720 + 360] } : undefined}
          transition={spin ? { duration: 2.6, times: [0, 0.6, 1], ease: [0.2, 0.8, 0.2, 1] } : undefined}
        >
          {/* Coin edge: stacked discs between the two faces. */}
          {Array.from({ length: thickness }, (_, index) => (
            <div
              key={index}
              className="absolute inset-0 rounded-full"
              style={{ background: metal.edge, transform: `translateZ(${index - thickness / 2}px)`, filter: `brightness(${0.75 + (index / thickness) * 0.35})` }}
            />
          ))}
          {face()}
          {face(true)}
        </motion.div>
        <div className="pointer-events-none absolute -bottom-3 left-1/2 h-3 w-3/4 -translate-x-1/2 rounded-full bg-black/20 blur-md" aria-hidden />
      </div>
    </div>
  );
}
