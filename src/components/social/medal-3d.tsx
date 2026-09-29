"use client";

import { useId } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { medalIconNodes } from "@/lib/medal-icons";
import type { Achievement } from "@/lib/social-data";

type Tier = Achievement["tier"];
type Metal = { light: string; mid: string; dark: string; deep: string; shine: string };

const metals: Record<Tier, Metal> = {
  bronze: { light: "#ffd6b0", mid: "#c9804a", dark: "#8a4a22", deep: "#5c2d12", shine: "#fff1e2" },
  prata: { light: "#ffffff", mid: "#c7cfd6", dark: "#8995a0", deep: "#56626c", shine: "#ffffff" },
  ouro: { light: "#fff3b8", mid: "#f0bf3c", dark: "#b8860b", deep: "#7a5500", shine: "#fffbe6" },
  diamante: { light: "#ffffff", mid: "#bcd9ff", dark: "#7f9cf0", deep: "#4a4fb0", shine: "#f3e9ff" },
};

const ribbons: Record<Tier, { base: string; dark: string; stripe: string }> = {
  bronze: { base: "#b3261e", dark: "#7a140f", stripe: "#f4e6d4" },
  prata: { base: "#1d5aa6", dark: "#123a6c", stripe: "#e9eef5" },
  ouro: { base: "#087a50", dark: "#04462d", stripe: "#f3e3a6" },
  diamante: { base: "#4b2a86", dark: "#2a1350", stripe: "#bfe9ff" },
};

const sizes = { sm: 56, md: 88, lg: 170 } as const;

// Shared geometry, built once: every leaf and bead goes into a single path so
// each medal is a handful of SVG nodes (viewBox 200×200, coin centered).
const C = 100;
const leafPath = (() => {
  let d = "";
  for (const side of [-1, 1]) {
    for (let index = 0; index < 9; index++) {
      const t = index / 8;
      const angle = Math.PI / 2 + side * (0.35 + t * 1.95);
      const size = 9 - t * 3;
      const baseX = C + Math.cos(angle) * 60;
      const baseY = C + Math.sin(angle) * 60;
      const tangent = angle + (side * Math.PI) / 2;
      for (const offset of [-1, 1]) {
        const tilt = tangent - side * offset * 0.6;
        const cx = baseX + Math.cos(tilt) * size * 0.75;
        const cy = baseY + Math.sin(tilt) * size * 0.75;
        const ax = Math.cos(tilt) * size, ay = Math.sin(tilt) * size;
        const bx = -Math.sin(tilt) * size * 0.42, by = Math.cos(tilt) * size * 0.42;
        d += `M${(cx - ax).toFixed(2)} ${(cy - ay).toFixed(2)}Q${(cx + bx * 2).toFixed(2)} ${(cy + by * 2).toFixed(2)} ${(cx + ax).toFixed(2)} ${(cy + ay).toFixed(2)}Q${(cx - bx * 2).toFixed(2)} ${(cy - by * 2).toFixed(2)} ${(cx - ax).toFixed(2)} ${(cy - ay).toFixed(2)}Z`;
      }
    }
  }
  return d;
})();
const beadPath = (() => {
  let d = "";
  for (let index = 0; index < 48; index++) {
    const angle = (index / 48) * Math.PI * 2;
    const x = C + Math.cos(angle) * 74, y = C + Math.sin(angle) * 74, r = 1.7;
    d += `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  return d;
})();
const starPath = (() => {
  const star = (cx: number, cy: number, outer: number) => {
    let d = "";
    for (let point = 0; point < 10; point++) {
      const r = point % 2 === 0 ? outer : outer * 0.45;
      const a = -Math.PI / 2 + (point * Math.PI) / 5;
      d += `${point ? "L" : "M"}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
    }
    return `${d}Z`;
  };
  return star(C - 15, 50, 3.6) + star(C, 47, 4.6) + star(C + 15, 50, 3.6);
})();

function IconShape({ icon, color, dx = 0, dy = 0 }: { icon: string; color: string; dx?: number; dy?: number }) {
  const nodes = medalIconNodes[icon] ?? medalIconNodes.medal;
  // Lucide icons live on a 24px grid; scale them into the medallion.
  return (
    <g transform={`translate(${C - 30 + dx} ${C - 30 + dy}) scale(2.5)`} fill={color} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {nodes.map(([tag, attrs], index) => {
        const Element = tag as "path";
        return <Element key={index} {...attrs} />;
      })}
    </g>
  );
}

function MedalFace({ tier, icon }: { tier: Tier; icon: string }) {
  const metal = metals[tier];
  const id = useId().replace(/:/g, "");
  const url = (name: string) => `url(#${id}-${name})`;
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.45" stopColor={metal.mid} />
          <stop offset="1" stopColor={metal.deep} />
        </linearGradient>
        <linearGradient id={`${id}-bevel`} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.5" stopColor={metal.mid} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.55" stopColor={metal.mid} />
          <stop offset="1" stopColor={metal.dark} />
        </radialGradient>
        {tier === "diamante" && (
          <linearGradient id={`${id}-iris`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd6f5" stopOpacity="0.55" />
            <stop offset="0.35" stopColor="#c8f1ff" stopOpacity="0" />
            <stop offset="0.65" stopColor="#d9ffe8" stopOpacity="0.45" />
            <stop offset="1" stopColor="#c7c2ff" stopOpacity="0" />
          </linearGradient>
        )}
      </defs>
      {/* Bail: the loop the ribbon goes through. */}
      <ellipse cx={C} cy={9} rx={6} ry={8} fill="none" stroke={url("rim")} strokeWidth={4} />
      <circle cx={C} cy={C} r={92} fill={url("rim")} />
      <circle cx={C} cy={C} r={84} fill={url("bevel")} />
      <circle cx={C} cy={C} r={80} fill={url("face")} />
      {tier === "diamante" && <circle cx={C} cy={C} r={80} fill={url("iris")} />}
      {/* Relief: a dark copy below-right and a light copy above-left read as embossed. */}
      <path d={beadPath} fill={metal.deep} opacity={0.55} transform="translate(0.7 0.9)" />
      <path d={beadPath} fill={metal.light} />
      <path d={leafPath} fill={metal.deep} opacity={0.5} transform="translate(0.8 1)" />
      <path d={leafPath} fill={metal.light} transform="translate(-0.5 -0.6)" />
      <path d={leafPath} fill={metal.mid} />
      {(tier === "ouro" || tier === "diamante") && (
        <>
          <path d={starPath} fill={metal.deep} opacity={0.5} transform="translate(0.6 0.8)" />
          <path d={starPath} fill={metal.light} />
        </>
      )}
      <circle cx={C} cy={C} r={37} fill={metal.dark} fillOpacity={0.4} />
      <circle cx={C} cy={C} r={37} fill="none" stroke={metal.deep} strokeOpacity={0.45} strokeWidth={2.4} transform="translate(0.6 0.8)" />
      <circle cx={C} cy={C} r={37} fill="none" stroke={metal.light} strokeWidth={2.2} />
      <IconShape icon={icon} color={metal.deep} dx={0.9} dy={1.1} />
      <IconShape icon={icon} color={metal.light} dx={-0.5} dy={-0.6} />
      <IconShape icon={icon} color={metal.mid} />
      {/* Soft specular highlight on the upper left. */}
      <ellipse cx={70} cy={58} rx={30} ry={14} fill={metal.shine} opacity={0.14} transform="rotate(-35 70 58)" />
    </svg>
  );
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
      <polygon points="60,0 96,0 66,110 36,110" fill={`url(#${id}-r)`} />
      <polygon points="60,0 96,0 66,110 36,110" fill={`url(#${id}-shade)`} />
    </svg>
  );
}

/** Metal medal drawn in SVG; tilts under the pointer and can spin on entrance. */
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
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-18, 18]), { stiffness: 200, damping: 18 });
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [14, -14]), { stiffness: 200, damping: 18 });
  const glareX = useTransform(pointerX, [-0.5, 0.5], ["15%", "85%"]);
  const canTilt = interactive && !reduceMotion && !spin;

  function track(event: React.PointerEvent<HTMLDivElement>) {
    if (!canTilt) return;
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  }

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: diameter }}>
      {ribbon && <div className="relative z-0 flex justify-center" style={{ marginBottom: -diameter * 0.1 }}><Ribbon tier={achievement.tier} diameter={diameter} /></div>}
      <div
        onPointerMove={track}
        onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}
        className="relative z-10"
        style={{ width: diameter, height: diameter, perspective: diameter * 5 }}
        role="img"
        aria-label={`Medalha ${achievement.title}`}
      >
        <motion.div
          className="absolute inset-0"
          style={canTilt ? { rotateX, rotateY } : undefined}
          initial={spin && !reduceMotion ? { rotateY: -540, scale: 0.6 } : false}
          animate={spin && !reduceMotion ? { rotateY: 0, scale: 1 } : undefined}
          transition={spin ? { duration: 1.6, ease: [0.2, 0.8, 0.2, 1] } : undefined}
        >
          <MedalFace tier={achievement.tier} icon={achievement.icon} />
          {canTilt && (
            <motion.span
              className="pointer-events-none absolute inset-[4%] overflow-hidden rounded-full mix-blend-soft-light"
              style={{ background: "linear-gradient(115deg, transparent 32%, rgba(255,255,255,.95) 48%, transparent 64%)", backgroundSize: "260% 100%", backgroundPositionX: glareX }}
            />
          )}
        </motion.div>
        <div className="pointer-events-none absolute -bottom-[8%] left-1/2 h-[8%] w-3/4 -translate-x-1/2 rounded-full bg-black/20 blur-md" aria-hidden />
      </div>
    </div>
  );
}
