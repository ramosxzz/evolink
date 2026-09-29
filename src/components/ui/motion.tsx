"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

/** Card entrance: slides up and fades, staggered by `index`. */
export function Reveal({ index = 0, className, children }: { index?: number; className?: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease, delay: reduceMotion ? 0 : index * 0.06 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts up to `value` once visible. The real value is rendered first, so the
 * number is correct even if the animation never runs (hidden tab, low power).
 */
export function AnimatedNumber({ value, format = v => String(Math.round(v)) }: { value: number; format?: (value: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();
  // Callers usually pass an inline formatter; keep it out of the effect deps.
  const formatRef = useRef(format);
  useEffect(() => { formatRef.current = format; });

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    if (reduceMotion) { node.textContent = formatRef.current(value); from.current = value; return; }
    const controls = animate(from.current, value, {
      duration: 0.8,
      ease,
      onUpdate: latest => { node.textContent = formatRef.current(latest); },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, inView, reduceMotion]);

  return <span ref={ref}>{format(value)}</span>;
}

/** Horizontal progress bar that fills with a spring. */
export function ProgressBar({ value, className = "bg-[#087a50]", track = "bg-[#e7f4ec]" }: { value: number; className?: string; track?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={`h-2 overflow-hidden rounded-full ${track}`}>
      <motion.div
        className={`h-full rounded-full ${className}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}
