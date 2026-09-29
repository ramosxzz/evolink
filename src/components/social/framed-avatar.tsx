"use client";

import type { Author } from "@/lib/social-data";

const sizes = { sm: "h-9 w-9 text-xs", md: "h-12 w-12 text-sm", lg: "h-20 w-20 text-xl", xl: "h-28 w-28 text-3xl" } as const;

/** Avatar with the user's unlocked frame (see .frame-* in globals.css). */
export function FramedAvatar({ author, size = "md" }: { author: Pick<Author, "name" | "avatarUrl" | "frame">; size?: keyof typeof sizes }) {
  const initials = author.name.split(" ").filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  const framed = author.frame && author.frame !== "none";
  const inner = (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-200 to-teal-500 font-bold text-[#07352b] ${sizes[size]} ${framed ? "ring-2 ring-white" : ""}`}>
      {author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- public avatar from Supabase Storage
        <img src={author.avatarUrl} alt={author.name} className="h-full w-full object-cover" />
      ) : initials}
    </span>
  );
  return framed ? <span className={`frame-ring frame-${author.frame} inline-flex shrink-0`}>{inner}</span> : inner;
}
