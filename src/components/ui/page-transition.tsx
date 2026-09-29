"use client";

import { motion, useReducedMotion } from "motion/react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return <motion.div initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] as const }}>{children}</motion.div>;
}
