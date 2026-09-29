"use client";

import { useId, useState } from "react";
import { MoveHorizontal } from "lucide-react";

/** Before/after comparison: drag the handle (or use the arrow keys) to reveal. */
export function BeforeAfter({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [split, setSplit] = useState(50);
  const id = useId();
  return (
    <div className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl bg-[#eef3f0]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`${alt}, depois`} className="absolute inset-0 size-full object-cover" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={`${alt}, antes`} className="absolute inset-0 size-full object-cover" draggable={false} />
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">Antes</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#087a50]/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">Depois</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.08)]" style={{ left: `${split}%` }}>
        <span className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#10291f] shadow-lg">
          <MoveHorizontal size={18} />
        </span>
      </div>
      <label htmlFor={id} className="sr-only">Comparar antes e depois</label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={event => setSplit(Number(event.target.value))}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
