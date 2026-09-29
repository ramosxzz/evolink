"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

const subscribe = () => () => {};

/**
 * Bottom sheet on phones, centered dialog on larger screens. Rendered in a
 * portal on <body>, so parents with transforms (page and card animations)
 * cannot trap or misplace it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("input, textarea, select, [role=combobox]")?.focus(), 60);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (!mounted) return null;
  const width = size === "sm" ? "sm:max-w-sm" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-[#06221b]/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={panelRef}
            drag={reduceMotion ? false : "y"}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}
            initial={reduceMotion ? { opacity: 0 } : { y: "100%", opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%", opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-12px_48px_-12px_rgba(6,34,27,.35)] sm:rounded-3xl ${width}`}
          >
            <div onPointerDown={event => dragControls.start(event)} className="flex cursor-grab touch-none justify-center pb-1 pt-3 sm:hidden" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-[#d5e0da]" />
            </div>
            <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-3 sm:pt-6">
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">{title}</h2>
                {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
              </div>
              <button onClick={onClose} aria-label="Fechar" className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--mint)] hover:text-[var(--ink)]">
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-2">{children}</div>
            {footer && <footer className="flex justify-end gap-2 border-t border-[var(--line)] bg-[#fbfdfc] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
