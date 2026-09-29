"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, Clock3, Lock } from "lucide-react";
import { Button } from "@/components/app-shell";
import { coachAccess, GRACE_DAYS, type Viewer } from "@/lib/evolink-data";

// Pages a coach can still open after the subscription ends.
const openWhenExpired = ["/profissional/assinatura", "/profissional/configuracoes", "/termos"];

export function useCoachAccess(viewer: Viewer) {
  const [now] = useState(() => Date.now());
  return viewer.role === "professional" ? coachAccess(viewer.subscription, now) : null;
}

export function isLockedPath(pathname: string) {
  return !openWhenExpired.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

const plural = (days: number) => `${days} ${days === 1 ? "dia" : "dias"}`;

export function SubscriptionBanner({ viewer, pathname }: { viewer: Viewer; pathname: string }) {
  const router = useRouter();
  const access = useCoachAccess(viewer);
  if (!access || access.state === "ok" || access.state === "expired" || pathname === "/profissional/assinatura") return null;
  const grace = access.state === "grace";
  const text = grace
    ? `Sua assinatura venceu. Você ainda tem ${plural(access.daysLeft)} de acesso para renovar.`
    : access.trial
      ? `Seu teste grátis termina em ${plural(access.daysLeft)}.`
      : `Sua assinatura vence em ${plural(access.daysLeft)}.`;
  return (
    <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${grace ? "bg-[#fdecec] text-[#8f2424]" : "bg-[#fff6dc] text-[#6d4c00]"}`}>
      {grace ? <AlertTriangle size={18} className="shrink-0" /> : <Clock3 size={18} className="shrink-0" />}
      <span className="min-w-0 flex-1">{text}</span>
      <button onClick={() => router.push("/profissional/assinatura")} className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold transition hover:bg-white active:scale-[0.97]">
        {access.trial && !grace ? "Assinar agora" : "Renovar"}
      </button>
    </div>
  );
}

export function SubscriptionLocked() {
  const router = useRouter();
  return (
    <section className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-8 text-center shadow-[var(--card-shadow)]">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e7f4ec] text-[var(--emerald)]"><Lock size={26} /></span>
      <h1 className="mt-5 text-xl font-bold">Sua assinatura venceu</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        Passaram-se os {GRACE_DAYS} dias de tolerância. Seus alunos, treinos e dietas continuam salvos, e seus alunos seguem acessando normalmente. Renove para voltar a usar a área do treinador.
      </p>
      <Button className="mt-6 w-full" onClick={() => router.push("/profissional/assinatura")}>
        <span className="inline-flex items-center gap-2"><BadgeCheck size={16} /> Renovar com Pix</span>
      </Button>
    </section>
  );
}
