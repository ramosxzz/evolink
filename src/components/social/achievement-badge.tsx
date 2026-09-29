"use client";

import { ClipboardCheck, Crown, Dumbbell, Flag, Flame, Footprints, Heart, Lock, Medal, MessageCircle, Route, Scale, Trophy, Weight } from "lucide-react";
import type { Achievement } from "@/lib/social-data";

export const achievementIcons: Record<string, typeof Medal> = {
  dumbbell: Dumbbell, crown: Crown, weight: Weight, medal: Medal, footprints: Footprints, flag: Flag, trophy: Trophy,
  route: Route, flame: Flame, clipboard: ClipboardCheck, scale: Scale, message: MessageCircle, heart: Heart,
};

export const tierStyles: Record<Achievement["tier"], { label: string; badge: string; ring: string; text: string }> = {
  bronze: { label: "Bronze", badge: "bg-gradient-to-br from-[#f3c08f] to-[#a0522d] text-white", ring: "ring-[#e8a066]", text: "text-[#8a4a20]" },
  prata: { label: "Prata", badge: "bg-gradient-to-br from-[#f4f6f8] to-[#8e99a3] text-[#2b3640]", ring: "ring-[#b8c2ca]", text: "text-[#5a6671]" },
  ouro: { label: "Ouro", badge: "bg-gradient-to-br from-[#ffe28a] to-[#c99700] text-[#4a3700]", ring: "ring-[#e6b800]", text: "text-[#8a6d00]" },
  diamante: { label: "Diamante", badge: "bg-gradient-to-br from-[#aeefff] via-[#c9b3ff] to-[#7de2ff] text-[#23225a]", ring: "ring-[#9fd8ff]", text: "text-[#4b3fa8]" },
};

/** Round medal: colored by tier when earned, grey with a lock when not. */
export function AchievementBadge({ achievement, earned, size = "md" }: { achievement: Pick<Achievement, "icon" | "tier" | "title">; earned: boolean; size?: "sm" | "md" | "lg" }) {
  const Icon = achievementIcons[achievement.icon] ?? Medal;
  const dimension = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-20 w-20" : "h-14 w-14";
  const iconSize = size === "sm" ? 18 : size === "lg" ? 34 : 24;
  return (
    <span
      title={achievement.title}
      className={`relative grid shrink-0 place-items-center rounded-full shadow-sm ${dimension} ${earned ? `${tierStyles[achievement.tier].badge} ring-4 ${tierStyles[achievement.tier].ring} ring-offset-2` : "bg-[#edf2ef] text-[#b3c2bb]"}`}
    >
      <Icon size={iconSize} />
      {!earned && <Lock size={12} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5 text-[#91a39b]" />}
    </span>
  );
}
