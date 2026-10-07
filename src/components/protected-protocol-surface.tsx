"use client";

import { useEffect, useMemo, useState } from "react";
import { EyeOff, ShieldCheck } from "lucide-react";

type ProtocolPrivacyOverlayProps = {
  viewer: { id: string; fullName: string };
  kind: "TREINO" | "DIETA";
};

/**
 * Identifies sensitive protocols in captures and conceals the page while it is
 * out of focus. Browsers cannot block OS capture reliably, so this is a
 * deterrent and audit aid rather than a promise that screenshots are blocked.
 */
export function ProtocolPrivacyOverlay({ viewer, kind }: ProtocolPrivacyOverlayProps) {
  const [obscured, setObscured] = useState(false);
  const [stamp, setStamp] = useState("");
  const shortId = viewer.id.replaceAll("-", "").slice(0, 8).toUpperCase();

  useEffect(() => {
    const updateStamp = () => setStamp(new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()));
    const onVisibility = () => setObscured(document.visibilityState !== "visible");
    const onBlur = () => setObscured(true);
    const onFocus = () => setObscured(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "PrintScreen") return;
      setObscured(true);
      window.setTimeout(() => {
        if (document.visibilityState === "visible" && document.hasFocus()) setObscured(false);
      }, 1400);
    };

    updateStamp();
    const clock = window.setInterval(updateStamp, 60_000);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const watermark = useMemo(
    () => `${viewer.fullName} · ${shortId} · ${kind} · ${stamp || "CONTEÚDO IDENTIFICADO"}`,
    [kind, shortId, stamp, viewer.fullName],
  );

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[19] overflow-hidden">
        <div className="absolute -inset-28 grid -rotate-[17deg] grid-cols-2 content-around gap-x-16 gap-y-24 lg:grid-cols-3">
          {Array.from({ length: 21 }, (_, index) => (
            <span key={index} className="whitespace-nowrap text-[9px] font-black tracking-[.12em] text-[var(--ink)] opacity-[.06] sm:text-[10px]">
              {watermark}
            </span>
          ))}
        </div>
      </div>

      {obscured && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-6 text-center backdrop-blur-2xl">
          <div>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--mint)] text-[var(--emerald)]">
              <EyeOff size={24} />
            </span>
            <p className="mt-4 font-bold">Conteúdo protegido</p>
            <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">Volte ao Evolink para visualizar seu protocolo.</p>
          </div>
        </div>
      )}

      <span className="pointer-events-none fixed right-5 top-20 z-[19] hidden items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--card)] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)] shadow-sm sm:inline-flex">
        <ShieldCheck size={12} /> Conteúdo identificado
      </span>
    </>
  );
}
