"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Apple, Bell, BellRing, BookOpen, CalendarDays, ChevronRight, CircleDollarSign, ClipboardCheck, Dumbbell, Globe2, HeartPulse, Home, LayoutDashboard,
  LayoutGrid, Library, LogOut, MessageCircle, Plus, Settings, Target, TrendingUp, Trophy, UserRound, Users,
} from "lucide-react";
import { AchievementCelebration } from "@/components/social/achievement-celebration";
import { Modal } from "@/components/ui/modal";
import { getNotifications, getViewer, markNotificationsRead } from "@/lib/evolink-data";
import { createClient } from "@/lib/supabase/client";

type Profile = "student" | "professional";
type NavItem = { label: string; href: string; icon: typeof Home };
type NavGroup = { title: string; items: NavItem[] };
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const studentNav: NavGroup[] = [
  { title: "Hoje", items: [
    { label: "Início", href: "/aluno", icon: Home },
    { label: "Treino", href: "/aluno/treino", icon: Dumbbell },
    { label: "Dieta", href: "/aluno/dieta", icon: Apple },
    { label: "Cardio", href: "/aluno/cardio", icon: HeartPulse },
    { label: "Hábitos", href: "/aluno/habitos", icon: Target },
  ] },
  { title: "Progresso", items: [
    { label: "Evolução", href: "/aluno/evolucao", icon: TrendingUp },
    { label: "Check-in", href: "/aluno/check-in", icon: ClipboardCheck },
    { label: "Conquistas", href: "/conquistas", icon: Trophy },
  ] },
  { title: "Comunidade", items: [
    { label: "Feed", href: "/aluno/comunidade", icon: Globe2 },
    { label: "Eventos", href: "/eventos", icon: CalendarDays },
    { label: "Chat", href: "/aluno/chat", icon: MessageCircle },
  ] },
];
const studentTabs = ["/aluno", "/aluno/treino", "/aluno/dieta", "/aluno/comunidade"];

const professionalNav: NavGroup[] = [
  { title: "Acompanhamento", items: [
    { label: "Painel", href: "/profissional", icon: LayoutDashboard },
    { label: "Alunos", href: "/profissional/alunos", icon: Users },
    { label: "Check-ins", href: "/profissional/check-ins", icon: ClipboardCheck },
    { label: "Chat", href: "/profissional/chat", icon: MessageCircle },
  ] },
  { title: "Protocolos", items: [
    { label: "Treinos", href: "/profissional/treinos", icon: Dumbbell },
    { label: "Dietas", href: "/profissional/dietas", icon: Apple },
    { label: "Modelos", href: "/profissional/modelos", icon: BookOpen },
    { label: "Biblioteca", href: "/profissional/biblioteca/exercicios", icon: Library },
  ] },
  { title: "Negócio", items: [
    { label: "Financeiro", href: "/profissional/financeiro", icon: CircleDollarSign },
    { label: "CRM e lembretes", href: "/profissional/crm", icon: BellRing },
  ] },
  { title: "Comunidade", items: [
    { label: "Feed", href: "/profissional/comunidade", icon: Globe2 },
    { label: "Eventos", href: "/eventos", icon: CalendarDays },
  ] },
];
const professionalTabs = ["/profissional", "/profissional/alunos", "/profissional/check-ins", "/profissional/chat"];

const roots = new Set(["/aluno", "/profissional"]);
const isActive = (path: string, href: string) => (roots.has(href) ? path === href : path === href || path.startsWith(`${href}/`));

// When the persistent frame is mounted, pages that still render <Shell> just
// pass their content through, so the sidebar never remounts on navigation.
const FrameContext = createContext(false);

export function AppFrame({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const reduceMotion = useReducedMotion();
  const [viewer, setViewer] = useState<{ id: string; name: string } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const groups = profile === "student" ? studentNav : professionalNav;
  const tabs = profile === "student" ? studentTabs : professionalTabs;
  const allItems = groups.flatMap(group => group.items);
  const current = allItems.find(item => isActive(path, item.href));
  // Pages reached from the user menu or links, which are not in the sidebar.
  const extraTitles: [string, string][] = [["/aluno/perfil", "Conta"], ["/profissional/configuracoes", "Configurações"], ["/u/", "Perfil"], ["/aluno/check-in", "Check-in"], ["/profissional/treinos", "Treinos"], ["/profissional/dietas", "Dietas"]];
  const title = current?.label ?? extraTitles.find(([prefix]) => path.startsWith(prefix))?.[1] ?? "";

  useEffect(() => {
    let active = true;
    getViewer().then(result => { if (active && result) setViewer({ id: result.id, name: result.fullName }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in history) window.scrollTo({ top: 0 });
  }, [path]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  const go = (href: string) => { setMoreOpen(false); router.push(href); };
  const moreItems = [...allItems.filter(item => !tabs.includes(item.href)), { label: "Meu perfil", href: "/u/me", icon: UserRound }, { label: profile === "student" ? "Conta" : "Configurações", href: profile === "student" ? "/aluno/perfil" : "/profissional/configuracoes", icon: Settings }];

  return (
    <FrameContext.Provider value>
      <div className="min-h-[100dvh] bg-[var(--surface)]">
        <InstallPWAButton />
        {profile === "student" && viewer && <AchievementCelebration userId={viewer.id} />}

        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-[var(--line)] bg-white lg:flex">
          <button onClick={() => go(profile === "student" ? "/aluno" : "/profissional")} className="flex h-16 shrink-0 items-center gap-2.5 px-6">
            <Mark />
            <span className="text-lg font-bold tracking-tight">evolink</span>
          </button>
          <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-3">
            {groups.map(group => (
              <div key={group.title}>
                <p className="px-3 pb-1.5 text-xs font-semibold text-[#8a9c94]">{group.title}</p>
                <ul className="space-y-0.5">
                  {group.items.map(item => {
                    const active = isActive(path, item.href);
                    return (
                      <li key={item.href}>
                        <button onClick={() => go(item.href)} className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "text-[var(--emerald)]" : "text-[#51645c] hover:bg-[#f3f7f5] hover:text-[var(--ink)]"}`}>
                          {active && <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-[var(--mint)]" transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }} />}
                          <item.icon size={18} strokeWidth={2} className="relative" />
                          <span className="relative">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="border-t border-[var(--line)] p-3">
            <UserMenu profile={profile} name={viewer?.name ?? ""} onNavigate={go} onSignOut={signOut} />
          </div>
        </aside>

        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)]/85 px-4 backdrop-blur-md lg:ml-[264px] lg:px-8">
          <button onClick={() => go(profile === "student" ? "/aluno" : "/profissional")} className="flex items-center gap-2 lg:hidden" aria-label="Início">
            <Mark />
          </button>
          <p className="truncate text-sm font-semibold text-[var(--ink)] lg:text-base">{title}</p>
          <div className="ml-auto flex items-center gap-1">
            <NotificationButton />
            <div className="lg:hidden"><UserMenu profile={profile} name={viewer?.name ?? ""} onNavigate={go} onSignOut={signOut} compact /></div>
          </div>
        </header>

        <main className="lg:ml-[264px]">
          <motion.div
            key={path}
            initial={reduceMotion ? false : { y: 10 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-8 lg:pb-12 lg:pt-8"
          >
            {children}
          </motion.div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/95 pb-[max(.4rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden" aria-label="Navegação principal">
          <ul className="mx-auto grid max-w-md grid-cols-5">
            {[...tabs.map(href => allItems.find(item => item.href === href)!), { label: "Mais", href: "#mais", icon: LayoutGrid }].map(item => {
              const active = item.href === "#mais" ? moreOpen || (!tabs.some(tab => isActive(path, tab))) : isActive(path, item.href);
              return (
                <li key={item.href}>
                  <button onClick={() => (item.href === "#mais" ? setMoreOpen(true) : go(item.href))} className={`relative flex w-full flex-col items-center gap-1 pb-1.5 pt-2.5 text-[11px] font-semibold transition-colors ${active ? "text-[var(--emerald)]" : "text-[#8a9c94]"}`}>
                    {active && <motion.span layoutId="tab-active" className="absolute top-0 h-[3px] w-8 rounded-full bg-[var(--emerald)]" transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }} />}
                    <item.icon size={21} strokeWidth={active ? 2.3 : 2} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu" size="sm">
          <div className="grid grid-cols-3 gap-2">
            {moreItems.map(item => {
              const active = isActive(path, item.href);
              return (
                <button key={item.href} onClick={() => go(item.href)} className={`flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-xs font-semibold transition ${active ? "bg-[var(--mint)] text-[var(--emerald)]" : "bg-[#f5f8f6] text-[#40554c] hover:bg-[var(--mint)]"}`}>
                  <item.icon size={22} />
                  {item.label}
                </button>
              );
            })}
          </div>
          <button onClick={signOut} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] py-3 text-sm font-bold text-[#b94242] transition hover:bg-[#fdf1f0]">
            <LogOut size={16} />Sair da conta
          </button>
        </Modal>
      </div>
    </FrameContext.Provider>
  );
}

/** Kept for pages: inside AppFrame it only renders its children. */
function Shell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const insideFrame = useContext(FrameContext);
  if (insideFrame) return <>{children}</>;
  return <AppFrame profile={profile}>{children}</AppFrame>;
}

function UserMenu({ profile, name, onNavigate, onSignOut, compact = false }: { profile: Profile; name: string; onNavigate: (href: string) => void; onSignOut: () => void; compact?: boolean }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const items = [
    { label: "Meu perfil público", href: "/u/me", icon: UserRound },
    { label: profile === "student" ? "Conta e objetivos" : "Configurações", href: profile === "student" ? "/aluno/perfil" : "/profissional/configuracoes", icon: Settings },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={compact ? "grid h-10 w-10 place-items-center rounded-full" : "flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-[#f3f7f5]"}
      >
        <Avatar name={name || "?"} className={compact ? "h-8 w-8 text-[11px]" : "h-9 w-9"} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{name || "Carregando..."}</span>
              <span className="block text-xs text-[var(--muted)]">{profile === "student" ? "Atleta" : "Treinador"}</span>
            </span>
            <ChevronRight size={16} className={`text-[#8a9c94] transition ${open ? "-rotate-90" : ""}`} />
          </>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduceMotion ? false : { opacity: 0, y: compact ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: compact ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={`absolute z-40 w-60 rounded-2xl border border-[var(--line)] bg-white p-1.5 shadow-[0_18px_48px_-12px_rgba(16,46,37,.28)] ${compact ? "right-0 top-12 origin-top-right" : "bottom-full left-0 mb-2 origin-bottom-left"}`}
          >
            {items.map(item => (
              <button key={item.href} role="menuitem" onClick={() => { setOpen(false); onNavigate(item.href); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--mint)]">
                <item.icon size={16} className="text-[var(--muted)]" />{item.label}
              </button>
            ))}
            <div className="my-1 h-px bg-[var(--line)]" />
            <button role="menuitem" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#b94242] transition hover:bg-[#fdf1f0]">
              <LogOut size={16} />Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationButton() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof getNotifications>> | null>(null);
  const unread = (notes ?? []).filter(note => !note.read_at).length;

  useEffect(() => {
    let active = true;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | undefined;
    const supabase = createClient();
    const refresh = async (id: string) => { const items = await getNotifications(id); if (active) setNotes(items); };
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id;
      if (!active || !id) return;
      setViewerId(id);
      void refresh(id);
      channel = supabase.channel(`notifications:${id}:${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${id}` }, () => void refresh(id))
        .subscribe();
    });
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  async function markAll() {
    if (!viewerId) return;
    await markNotificationsRead(viewerId);
    const now = new Date().toISOString();
    setNotes(items => (items ?? []).map(item => ({ ...item, read_at: item.read_at ?? now })));
  }

  return (
    <div ref={ref} className="relative">
      <button aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`} onClick={() => setOpen(value => !value)} className={`relative grid h-10 w-10 place-items-center rounded-full transition ${open ? "bg-white text-[var(--ink)] shadow-sm" : "text-[#51645c] hover:bg-white"}`}>
        <Bell size={19} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-[#e8603c] px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="fixed left-3 right-3 top-[68px] z-40 origin-top-right overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_24px_60px_-16px_rgba(16,46,37,.32)] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <p className="font-bold">Notificações</p>
              {unread > 0 && <button onClick={() => void markAll()} className="text-xs font-bold text-[var(--emerald)] hover:underline">Marcar todas como lidas</button>}
            </div>
            <div className="max-h-[min(28rem,70dvh)] overflow-y-auto p-2">
              {notes === null ? (
                <div className="space-y-2 p-2">{[0, 1, 2].map(item => <div key={item} className="skeleton h-14 rounded-2xl" />)}</div>
              ) : notes.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Bell className="mx-auto text-[#b6c7bf]" />
                  <p className="mt-3 text-sm font-semibold">Tudo em dia</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Novidades do seu acompanhamento aparecem aqui.</p>
                </div>
              ) : notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => { void markAll(); setOpen(false); if (note.href) router.push(note.href); }}
                  className={`flex w-full gap-3 rounded-2xl p-3 text-left transition hover:bg-[#f3f7f5] ${note.read_at ? "" : "bg-[#f3faf6]"}`}
                >
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${note.read_at ? "bg-[#eef3f0] text-[#8a9c94]" : "bg-[var(--mint)] text-[var(--emerald)]"}`}><Bell size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--ink)]">{note.title}</span>
                    {note.body && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-relaxed text-[var(--muted)]">{note.body}</span>}
                    <span className="mt-1 block text-[11px] text-[#8a9c94]">{relativeTime(note.created_at)}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function relativeTime(date: string) {
  const minutes = Math.max(0, Math.round((new Date().getTime() - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)} h`;
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function InstallPWAButton() {
  const reduceMotion = useReducedMotion();
  const [event, setEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const capture = (installEvent: Event) => { installEvent.preventDefault(); setEvent(installEvent as InstallEvent); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  if (!event) return null;
  return (
    <motion.button
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      onClick={async () => { await event.prompt(); setEvent(null); }}
      className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/95 px-4 py-2.5 text-xs font-bold text-[var(--emerald)] shadow-lg backdrop-blur lg:bottom-6 lg:right-6"
    >
      <Plus size={15} />Instalar app
    </motion.button>
  );
}

function Mark() {
  return (
    <span className="relative block h-9 w-9 overflow-hidden rounded-xl bg-[#07352b]">
      <Image src="/brand/evolink-mark-192.png" alt="Evolink" fill sizes="36px" className="scale-125 object-cover" />
    </span>
  );
}

function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const letters = name.split(" ").filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  return <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c7efa0] to-[#3f9f75] text-xs font-bold text-[#0d3a2c] ${className}`}>{letters}</div>;
}

type ButtonKind = "primary" | "soft" | "outline" | "ghost" | "danger";
const buttonKinds: Record<ButtonKind, string> = {
  primary: "bg-[var(--emerald)] text-white shadow-[0_1px_2px_rgba(8,122,80,.3),inset_0_1px_0_rgba(255,255,255,.12)] hover:bg-[var(--emerald-dark)]",
  soft: "bg-[var(--mint)] text-[var(--emerald-dark)] hover:bg-[#dcefe4]",
  outline: "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[#c7d9cf] hover:bg-[#f8fbf9]",
  ghost: "text-[var(--ink)] hover:bg-[#eef4f0]",
  danger: "bg-[#fdecea] text-[#b3362f] hover:bg-[#fadcd8]",
};

function Button({ children, onClick, kind = "primary", className = "", disabled = false, type }: { children: React.ReactNode; onClick?: () => void; kind?: ButtonKind; className?: string; disabled?: boolean; type?: "button" | "submit" | "reset" }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type={type}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 ${buttonKinds[kind]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** Page heading. `kicker` is kept for compatibility; the top bar already names the section. */
function PageTitle({ title, text }: { kicker?: string; title: string; text: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)] md:text-[28px]">{title}</h1>
      <p className="mt-1.5 max-w-[65ch] text-sm leading-relaxed text-[var(--muted)]">{text}</p>
    </div>
  );
}

export { Shell, PageTitle, Button, Avatar };
