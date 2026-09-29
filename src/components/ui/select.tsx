"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string; hint?: string };

/**
 * Styled replacement for the native <select>: animated popover list with
 * keyboard support (arrows, Home/End, Enter, Escape, type-ahead).
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecione",
  label,
  disabled = false,
  className = "",
  size = "md",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const reduceMotion = useReducedMotion();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    // The list is fixed-positioned in a portal; close it if the page scrolls away.
    const onScroll = (event: Event) => { if (!listRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  // Place the list under the button, or above it when there is no room below.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const box = buttonRef.current.getBoundingClientRect();
    const width = Math.max(box.width, 192);
    const left = Math.min(box.left, window.innerWidth - width - 8);
    const below = window.innerHeight - box.bottom;
    setPosition(below < 300 && box.top > below ? { left, width, bottom: window.innerHeight - box.top + 6 } : { left, width, top: box.bottom + 6 });
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function openList() {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex(option => option.value === value)));
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); openList(); return; }
    if (!open) return;
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
    else if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => Math.min(options.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(options.length - 1); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(active); }
    else if (event.key === "Tab") setOpen(false);
    else if (event.key.length === 1) {
      const start = options.findIndex((option, index) => index > active && option.label.toLowerCase().startsWith(event.key.toLowerCase()));
      const match = start >= 0 ? start : options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
      if (match >= 0) setActive(match);
    }
  }

  const height = size === "sm" ? "min-h-9 px-3 text-xs" : "min-h-11 px-4 text-sm";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && <span id={`${id}-label`} className="mb-1.5 block text-sm font-bold text-[var(--ink)]">{label}</span>}
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={label ? `${id}-label` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white text-left font-medium outline-none transition ${height} ${open ? "border-[var(--emerald)] ring-4 ring-[var(--ring)]" : "border-[var(--line)] hover:border-[#c7d9cf]"} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${selected ? "text-[var(--ink)]" : "text-[#8fa39a]"}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#71837b] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {open && position && (
          <motion.ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-activedescendant={`${id}-option-${active}`}
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "fixed", left: position.left, width: position.width, top: position.top, bottom: position.bottom }}
            className="z-[80] max-h-72 origin-top overflow-y-auto overscroll-contain rounded-2xl border border-[var(--line)] bg-white p-1.5 shadow-[0_18px_48px_-12px_rgba(16,46,37,.28)]"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${index === active ? "bg-[var(--mint)]" : ""} ${isSelected ? "font-bold text-[var(--emerald)]" : "text-[var(--ink)]"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.hint && <span className="block truncate text-xs font-normal text-[#71837b]">{option.hint}</span>}
                  </span>
                  {isSelected && <Check size={15} className="shrink-0" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </div>
  );
}
