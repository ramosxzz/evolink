"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  ClipboardCheck,
  Crown,
  Dumbbell,
  Flag,
  Flame,
  Footprints,
  Heart,
  Lock,
  Medal,
  MessageCircle,
  Route,
  Scale,
  Trophy,
  Weight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Achievement } from "@/lib/social-data";

type Tier = Achievement["tier"];
type Palette = { edge: string; edgeSoft: string; face: string; icon: string };

const achievementIcons: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  crown: Crown,
  weight: Weight,
  medal: Medal,
  footprints: Footprints,
  flag: Flag,
  trophy: Trophy,
  route: Route,
  flame: Flame,
  clipboard: ClipboardCheck,
  scale: Scale,
  message: MessageCircle,
  heart: Heart,
};

const palettes: Record<Tier | "locked", Palette> = {
  bronze: { edge: "#9a6038", edgeSoft: "#e4b187", face: "#0b4738", icon: "#f8fbf9" },
  prata: { edge: "#8797a0", edgeSoft: "#d7dfe3", face: "#0b4738", icon: "#f8fbf9" },
  ouro: { edge: "#b78912", edgeSoft: "#f2d578", face: "#0b4738", icon: "#f8fbf9" },
  diamante: { edge: "#338896", edgeSoft: "#9ddee3", face: "#0b4738", icon: "#f8fbf9" },
  locked: { edge: "#c9d5cf", edgeSoft: "#e6ece8", face: "#eef3f0", icon: "#8fa198" },
};

const sizes = { sm: 56, md: 88, lg: 150 } as const;
const shield = "polygon(50% 0%, 88% 14%, 92% 58%, 50% 100%, 8% 58%, 12% 14%)";

export function AchievementEmblem({
  icon,
  tier,
  locked = false,
  size,
  title,
}: {
  icon: string;
  tier: Tier;
  locked?: boolean;
  size: number;
  title?: string;
}) {
  const palette = palettes[locked ? "locked" : tier];
  const Icon = achievementIcons[icon] ?? Medal;
  const inset = Math.max(3, Math.round(size * 0.075));

  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }} title={title}>
      <span
        className="absolute inset-0 drop-shadow-[0_5px_7px_rgba(4,35,27,.18)]"
        style={{ background: `linear-gradient(145deg, ${palette.edgeSoft}, ${palette.edge} 62%)`, clipPath: shield }}
      />
      <span
        className="absolute grid place-items-center overflow-hidden"
        style={{ inset, background: locked ? palette.face : `linear-gradient(145deg, #12624c, ${palette.face} 68%)`, clipPath: shield }}
      >
        <span className="absolute left-[24%] right-[24%] top-[17%] h-px bg-white/25" />
        <Icon aria-hidden style={{ width: size * 0.38, height: size * 0.38, color: palette.icon }} strokeWidth={2.1} />
      </span>
      {locked && (
        <span
          className="absolute bottom-0 right-0 grid place-items-center rounded-full border border-white/90 bg-white text-[#788b82] shadow-sm"
          style={{ width: Math.max(16, size * 0.3), height: Math.max(16, size * 0.3) }}
        >
          <Lock aria-hidden style={{ width: "52%", height: "52%" }} strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}

/** Kept for existing consumers while the visual language moves from coins to shields. */
export const FlatCoin = AchievementEmblem;

/** Achievement emblem with a short unlock motion and a single light pass. */
export function Medal3D({
  achievement,
  size = "md",
  spin = false,
}: {
  achievement: Pick<Achievement, "icon" | "tier" | "title">;
  size?: keyof typeof sizes;
  spin?: boolean;
}) {
  const reduceMotion = Boolean(useReducedMotion());
  const diameter = sizes[size];

  return (
    <motion.span
      className="relative inline-flex overflow-hidden"
      style={{ clipPath: shield }}
      role="img"
      aria-label={`Conquista ${achievement.title}`}
      initial={spin && !reduceMotion ? { scale: 0.72, rotate: -7, opacity: 0 } : false}
      animate={spin && !reduceMotion ? { scale: 1, rotate: 0, opacity: 1 } : undefined}
      transition={{ type: "spring", stiffness: 250, damping: 17 }}
    >
      <AchievementEmblem icon={achievement.icon} tier={achievement.tier} size={diameter} />
      {spin && !reduceMotion && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-white/35 blur-[2px]"
          initial={{ x: -diameter }}
          animate={{ x: diameter * 1.5 }}
          transition={{ duration: 0.7, delay: 0.18, ease: "easeOut" }}
        />
      )}
    </motion.span>
  );
}
