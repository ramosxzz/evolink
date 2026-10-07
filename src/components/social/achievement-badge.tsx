"use client";

import { AchievementEmblem } from "@/components/social/medal-3d";
import type { Achievement } from "@/lib/social-data";

export const tierStyles: Record<Achievement["tier"], { label: string; badge: string; ring: string; text: string }> = {
  bronze: { label: "Bronze", badge: "bg-gradient-to-br from-[#f3c08f] to-[#a0522d] text-white", ring: "ring-[#e8a066]", text: "text-[#8a4a20]" },
  prata: { label: "Prata", badge: "bg-gradient-to-br from-[#f4f6f8] to-[#8e99a3] text-[#2b3640]", ring: "ring-[#b8c2ca]", text: "text-[#5a6671]" },
  ouro: { label: "Ouro", badge: "bg-gradient-to-br from-[#ffe28a] to-[#c99700] text-[#4a3700]", ring: "ring-[#e6b800]", text: "text-[#8a6d00]" },
  diamante: { label: "Diamante", badge: "bg-gradient-to-br from-[#aeefff] via-[#c9b3ff] to-[#7de2ff] text-[#23225a]", ring: "ring-[#9fd8ff]", text: "text-[#4b3fa8]" },
};

/** Athletic shield: Evolink green when earned, muted with a lock when pending. */
export function AchievementBadge({ achievement, earned, size = "md" }: { achievement: Pick<Achievement, "icon" | "tier" | "title">; earned: boolean; size?: "sm" | "md" | "lg" }) {
  return <AchievementEmblem icon={achievement.icon} tier={achievement.tier} locked={!earned} size={size === "sm" ? 40 : size === "lg" ? 80 : 56} title={achievement.title} />;
}
