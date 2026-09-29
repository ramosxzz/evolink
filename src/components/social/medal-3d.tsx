"use client";

import { motion, useReducedMotion } from "motion/react";
import { Lock } from "lucide-react";
import { medalIconNodes } from "@/lib/medal-icons";
import type { Achievement } from "@/lib/social-data";

type Tier = Achievement["tier"];
type Palette = { rim: string; face: string; line: string; icon: string };

// Flat coin: dark rim, metal face, thin inner ring and a white line icon.
const palettes: Record<Tier | "locked", Palette> = {
  bronze: { rim: "#8F5429", face: "#C8804C", line: "#EDBE95", icon: "#ffffff" },
  prata: { rim: "#66737F", face: "#A3AEB8", line: "#D5DCE2", icon: "#ffffff" },
  ouro: { rim: "#A27705", face: "#E3AE22", line: "#F5D679", icon: "#ffffff" },
  diamante: { rim: "#4A50B2", face: "#7B89EE", line: "#C3CEFF", icon: "#ffffff" },
  locked: { rim: "#D3DCD7", face: "#E8EEEA", line: "#F6F9F7", icon: "#A7B6AE" },
};

const sizes = { sm: 56, md: 88, lg: 150 } as const;

export function FlatCoin({ icon, tier, locked = false, size, title }: { icon: string; tier: Tier; locked?: boolean; size: number; title?: string }) {
  const palette = palettes[locked ? "locked" : tier];
  const nodes = medalIconNodes[icon] ?? medalIconNodes.medal;
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }} title={title}>
      <svg viewBox="0 0 120 120" className="block h-full w-full" aria-hidden>
        <circle cx="60" cy="60" r="56" fill={palette.rim} />
        <circle cx="60" cy="60" r="48" fill={palette.face} />
        <circle cx="60" cy="60" r="40" fill="none" stroke={palette.line} strokeWidth="1.5" />
        <g transform="translate(40 40) scale(1.6667)" fill="none" stroke={palette.icon} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {nodes.map(([tag, attrs], index) => {
            const Element = tag as "path";
            return <Element key={index} {...attrs} />;
          })}
        </g>
      </svg>
      {locked && (
        <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-white p-[3px] shadow-sm" style={{ width: Math.max(16, size * 0.3), height: Math.max(16, size * 0.3) }}>
          <Lock className="h-full w-full text-[#91a39b]" strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}

/** Achievement medal as a flat coin. `spin` scales it in for the celebration. */
export function Medal3D({
  achievement,
  size = "md",
  spin = false,
}: {
  achievement: Pick<Achievement, "icon" | "tier" | "title">;
  size?: keyof typeof sizes;
  spin?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const diameter = sizes[size];
  return (
    <motion.span
      className="inline-flex"
      role="img"
      aria-label={`Medalha ${achievement.title}`}
      initial={spin && !reduceMotion ? { scale: 0.4, opacity: 0 } : false}
      animate={spin && !reduceMotion ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 16 }}
    >
      <FlatCoin icon={achievement.icon} tier={achievement.tier} size={diameter} />
    </motion.span>
  );
}
