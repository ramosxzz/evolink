"use client";

import { Star } from "lucide-react";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toLocaleString("pt-BR")} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} size={size} className={star <= Math.round(value) ? "fill-[#f2b705] text-[#f2b705]" : "fill-[#e3ebe6] text-[#e3ebe6]"} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Nota">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`} onClick={() => onChange(star)} className="rounded-lg p-1 transition active:scale-90">
          <Star size={28} className={star <= value ? "fill-[#f2b705] text-[#f2b705]" : "fill-[#e3ebe6] text-[#e3ebe6]"} />
        </button>
      ))}
    </div>
  );
}
