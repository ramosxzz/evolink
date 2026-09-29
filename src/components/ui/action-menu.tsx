"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MoreHorizontal } from "lucide-react";

export type Action = { label: string; icon?: typeof MoreHorizontal; onSelect: () => void; danger?: boolean; disabled?: boolean };

/** "⋯" button that opens a small list of actions, rendered in a portal. */
export function ActionMenu({ actions, label = "Mais ações" }: { actions: Action[]; label?: string }) {
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const box = buttonRef.current.getBoundingClientRect();
    const right = window.innerWidth - box.right;
    setPosition(window.innerHeight - box.bottom < 220 ? { bottom: window.innerHeight - box.top + 6, right } : { top: box.bottom + 6, right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button ref={buttonRef} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} className={`grid h-9 w-9 place-items-center rounded-xl border transition ${open ? "border-[var(--emerald)] bg-[var(--mint)] text-[var(--emerald)]" : "border-[var(--line)] bg-white text-[#51645c] hover:border-[#c7d9cf]"}`}>
        <MoreHorizontal size={17} />
      </button>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && position && (
            <motion.div
              ref={menuRef}
              role="menu"
              style={{ position: "fixed", top: position.top, bottom: position.bottom, right: position.right }}
              initial={reduceMotion ? false : { opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="z-[80] w-56 origin-top-right rounded-2xl border border-[var(--line)] bg-white p-1.5 shadow-[0_18px_48px_-12px_rgba(16,46,37,.28)]"
            >
              {actions.map(action => (
                <button
                  key={action.label}
                  role="menuitem"
                  disabled={action.disabled}
                  onClick={() => { setOpen(false); action.onSelect(); }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition disabled:opacity-50 ${action.danger ? "text-[#b3362f] hover:bg-[#fdecea]" : "text-[var(--ink)] hover:bg-[var(--mint)]"}`}
                >
                  {action.icon && <action.icon size={16} className={action.danger ? "" : "text-[var(--muted)]"} />}
                  {action.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
