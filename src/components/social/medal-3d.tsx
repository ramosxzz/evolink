"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { achievementIcons } from "@/components/social/achievement-badge";
import type { Achievement } from "@/lib/social-data";

type Tier = Achievement["tier"];

const ribbons: Record<Tier, { base: string; dark: string; stripe: string }> = {
  bronze: { base: "#b3261e", dark: "#7a140f", stripe: "#f4e6d4" },
  prata: { base: "#1d5aa6", dark: "#123a6c", stripe: "#e9eef5" },
  ouro: { base: "#087a50", dark: "#04462d", stripe: "#f3e3a6" },
  diamante: { base: "#4b2a86", dark: "#2a1350", stripe: "#bfe9ff" },
};

// Flat fallback when WebGL is unavailable.
const fallbackFaces: Record<Tier, string> = {
  bronze: "radial-gradient(circle at 32% 28%, #ffd9b0, #b3652c 60%, #6b3512)",
  prata: "radial-gradient(circle at 32% 28%, #ffffff, #a9b4bd 60%, #5d6871)",
  ouro: "radial-gradient(circle at 32% 28%, #fff4c2, #d9a300 60%, #7a5500)",
  diamante: "radial-gradient(circle at 32% 28%, #ffffff, #9fb7ff 55%, #4b3fa8)",
};

const sizes = { sm: 56, md: 88, lg: 170 } as const;

function useMedalImage(icon: string, tier: Tier) {
  const [state, setState] = useState<{ key: string; url: string | null; failed: boolean }>({ key: "", url: null, failed: false });
  const key = `${icon}:${tier}`;
  useEffect(() => {
    let active = true;
    import("@/lib/medal-renderer")
      .then(module => (module.webglAvailable() ? module.medalImage(icon, tier) : Promise.reject(new Error("sem WebGL"))))
      .then(url => { if (active) setState({ key, url, failed: false }); })
      .catch(() => { if (active) setState({ key, url: null, failed: true }); });
    return () => { active = false; };
  }, [icon, tier, key]);
  return state.key === key ? state : { url: null, failed: false };
}

function Ribbon({ tier, diameter }: { tier: Tier; diameter: number }) {
  const colors = ribbons[tier];
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 110" width={diameter * 0.62} height={diameter * 0.68} className="relative block" aria-hidden>
      <defs>
        {(["l", "r"] as const).map(side => (
          <linearGradient key={side} id={`${id}-${side}`} x1="0" x2="1" y1="0" y2="0" gradientTransform={side === "l" ? "skewX(14)" : "skewX(-14)"}>
            <stop offset="0" stopColor={colors.dark} />
            <stop offset="0.14" stopColor={colors.base} />
            <stop offset="0.38" stopColor={colors.base} />
            <stop offset="0.38" stopColor={colors.stripe} />
            <stop offset="0.62" stopColor={colors.stripe} />
            <stop offset="0.62" stopColor={colors.base} />
            <stop offset="0.86" stopColor={colors.base} />
            <stop offset="1" stopColor={colors.dark} />
          </linearGradient>
        ))}
        <linearGradient id={`${id}-shade`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.25" />
          <stop offset="0.25" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <polygon points="4,0 40,0 64,110 34,110" fill={`url(#${id}-l)`} />
      <polygon points="4,0 40,0 64,110 34,110" fill={`url(#${id}-shade)`} />
      <polygon points="60,0 96,0 66,110 36,110" fill={`url(#${id}-r)`} style={{ filter: "drop-shadow(-1.5px 0 1.5px rgba(0,0,0,.28))" }} />
      <polygon points="60,0 96,0 66,110 36,110" fill={`url(#${id}-shade)`} />
    </svg>
  );
}

function FallbackCoin({ tier, icon, diameter }: { tier: Tier; icon: string; diameter: number }) {
  const Icon = achievementIcons[icon] ?? achievementIcons.medal;
  return (
    <span className="absolute inset-0 grid place-items-center rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,.6),inset_0_-3px_6px_rgba(0,0,0,.35)]" style={{ background: fallbackFaces[tier] }}>
      <Icon size={diameter * 0.4} strokeWidth={2.4} className="text-black/45" />
    </span>
  );
}

function LiveMedal({ icon, tier, spin, onFail }: { icon: string; tier: Tier; spin: boolean; onFail: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    import("@/lib/medal-renderer").then(async module => {
      if (!canvasRef.current || cancelled) return;
      if (!module.webglAvailable()) return onFail();
      const dispose = await module.mountLiveMedal(canvasRef.current, icon, tier, { spin, reduceMotion: Boolean(reduceMotion) });
      if (cancelled) dispose(); else cleanup = dispose;
    }).catch(onFail);
    return () => { cancelled = true; cleanup?.(); };
  }, [icon, tier, spin, reduceMotion, onFail]);
  return <canvas ref={canvasRef} className="absolute -inset-[12.5%] h-[125%] w-[125%] cursor-grab touch-none active:cursor-grabbing" />;
}

/**
 * Metal medal rendered in real 3D (three.js): lists get a cached still that
 * tilts under the pointer; the large size can run live, spinning and draggable.
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
  const diameter = sizes[size];
  const live = size === "lg";
  const [liveFailed, setLiveFailed] = useState(false);
  const still = useMedalImage(achievement.icon, achievement.tier);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-18, 18]), { stiffness: 200, damping: 18 });
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [14, -14]), { stiffness: 200, damping: 18 });
  const glareX = useTransform(pointerX, [-0.5, 0.5], ["15%", "85%"]);
  const canTilt = interactive && !reduceMotion && !live;
  const failLive = useCallback(() => setLiveFailed(true), []);

  function track(event: React.PointerEvent<HTMLDivElement>) {
    if (!canTilt) return;
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  }

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: diameter }}>
      {ribbon && <div className="relative z-0 flex justify-center" style={{ marginBottom: -diameter * 0.06 }}><Ribbon tier={achievement.tier} diameter={diameter} /></div>}
      <div
        onPointerMove={track}
        onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}
        className="relative z-10"
        style={{ width: diameter, height: diameter, perspective: diameter * 5 }}
        role="img"
        aria-label={`Medalha ${achievement.title}`}
      >
        {live && !liveFailed ? (
          <LiveMedal icon={achievement.icon} tier={achievement.tier} spin={spin} onFail={failLive} />
        ) : (
          <motion.div className="absolute inset-0" style={{ rotateX: canTilt ? rotateX : 0, rotateY: canTilt ? rotateY : 0, transformStyle: "preserve-3d" }}>
            {still.url ? (
              <>
                <motion.img
                  src={still.url}
                  alt=""
                  draggable={false}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute -inset-[12.5%] h-[125%] w-[125%] max-w-none select-none"
                />
                <motion.span
                  className="pointer-events-none absolute inset-[3%] overflow-hidden rounded-full mix-blend-soft-light"
                  style={{ background: "linear-gradient(115deg, transparent 32%, rgba(255,255,255,.9) 48%, transparent 64%)", backgroundSize: "260% 100%", backgroundPositionX: canTilt ? glareX : undefined }}
                  animate={canTilt || reduceMotion ? undefined : { backgroundPositionX: ["120%", "-20%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                />
              </>
            ) : still.failed ? (
              <FallbackCoin tier={achievement.tier} icon={achievement.icon} diameter={diameter} />
            ) : (
              <span className="skeleton absolute inset-0 rounded-full" />
            )}
          </motion.div>
        )}
        <div className="pointer-events-none absolute -bottom-[10%] left-1/2 h-[9%] w-3/4 -translate-x-1/2 rounded-full bg-black/25 blur-md" aria-hidden />
      </div>
    </div>
  );
}
