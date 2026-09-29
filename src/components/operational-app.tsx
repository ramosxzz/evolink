"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrandAuth } from "@/components/brand-auth";
import { AppFrame, Button, PageTitle, Shell } from "@/components/app-shell";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ChatPage } from "@/components/chat-page";
import { CheckinPage } from "@/components/checkin-page";
import { CoachCheckinsPage } from "@/components/coach-checkins-page";
import { DietPage } from "@/components/diet-page";
import { EvolutionPage } from "@/components/evolution-page";
import { EventDetailPage } from "@/components/events/event-detail-page";
import { EventFormPage } from "@/components/events/event-form-page";
import { EventsPage } from "@/components/events/events-page";
import { LegalPage } from "@/components/legal-page";
import { PlanBuilder } from "@/components/plan-builder";
import { PrepPage } from "@/components/prep-page";
import { RankingPage } from "@/components/ranking-page";
import { StudentHomePage } from "@/components/student-home-page";
import { StudentsPage } from "@/components/students-page";
import { StudentProfilePage } from "@/components/student-profile-page";
import { ProfessionalCrmPage } from "@/components/professional-crm-page";
import { WorkoutLogbookPage } from "@/components/workout-logbook-page";
import { AchievementsPage } from "@/components/social/achievements-page";
import { FeedPage } from "@/components/social/feed-page";
import { ProfilePage } from "@/components/social/profile-page";
import {
  CardioPage,
  HabitsPage,
} from "@/components/wellness-pages";
import {
  ProfessionalLibraryPage,
  ProfessionalFinancePage,
  ProfessionalSettingsPage,
  ProfessionalTemplatesPage,
} from "@/components/professional-pages";
import {
  LiveProfessionalDashboard,
  LiveProfessionalStudentPage,
} from "@/components/operational-pages";
import { coachAccess, getViewer, invalidateViewer, VIEWER_CHANGED_EVENT, type Viewer } from "@/lib/evolink-data";
import { createClient } from "@/lib/supabase/client";
import { watchSystemTheme } from "@/lib/theme";
import { BillingPage } from "@/components/billing-page";
import { CoachDirectory } from "@/components/portfolio/coach-directory";
import { CoachPage } from "@/components/portfolio/coach-page";
import { PortfolioEditor } from "@/components/portfolio/portfolio-editor";
import { isLockedPath, SubscriptionBanner, SubscriptionLocked } from "@/components/subscription-gate";

const publicPaths = ["/", "/login", "/cadastro", "/recuperar-senha", "/redefinir-senha"] as const;

export default function OperationalApp() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewer, setViewer] = useState<Viewer | null | undefined>(undefined);
  useEffect(() => {
    window.sessionStorage.removeItem("evolink-demo-role");
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return watchSystemTheme();
  }, []);
  useEffect(() => {
    const reload = () =>
      getViewer().then(next =>
        setViewer(current => (JSON.stringify(current) === JSON.stringify(next) ? current : next)),
      );
    reload();
    // Token refreshes also fire here; only identity changes need a reload.
    const { data } = createClient().auth.onAuthStateChange(event => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      invalidateViewer();
      reload();
    });
    window.addEventListener(VIEWER_CHANGED_EVENT, reload);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener(VIEWER_CHANGED_EVENT, reload);
    };
  }, []);
  useEffect(() => {
    // The recovery link signs the user in; keep them on the new-password form.
    if (
      viewer &&
      pathname !== "/redefinir-senha" &&
      publicPaths.includes(pathname as (typeof publicPaths)[number])
    )
      router.replace(
        viewer.role === "professional" ? "/profissional" : "/aluno",
      );
  }, [pathname, router, viewer]);
  useEffect(() => {
    if (viewer?.role === "student" && pathname.startsWith("/profissional"))
      router.replace("/aluno");
    if (viewer?.role === "professional" && pathname.startsWith("/aluno"))
      router.replace("/profissional");
  }, [pathname, router, viewer]);
  if (pathname === "/termos") return <LegalPage />;
  if (publicPaths.includes(pathname as (typeof publicPaths)[number]))
    return <BrandAuth path={pathname as (typeof publicPaths)[number]} />;
  if (viewer === undefined)
    return (
      <div className="min-h-[100dvh] bg-[var(--surface)]">
        <div className="fixed inset-y-0 left-0 hidden w-[264px] border-r border-[var(--line)] bg-white p-6 lg:block">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <div className="mt-10 space-y-3">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-9 rounded-xl" />)}</div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pt-24 md:px-8 lg:ml-[264px]"><PageSkeleton /></div>
      </div>
    );
  if (!viewer) return <BrandAuth path="/login" />;
  if (viewer.role === "student" && viewer.student?.accessStatus === "suspended")
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#f5faf7] p-5">
        <section className="w-full max-w-md rounded-3xl border border-[#ead9d7] bg-white p-7 text-center shadow-xl shadow-emerald-950/5">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fdebea] text-2xl">
            !
          </span>
          <p className="mt-5 text-xs font-bold tracking-[.14em] text-[#b94242]">
            ACESSO TEMPORARIAMENTE SUSPENSO
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            Regularize sua mensalidade
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#71837b]">
            {viewer.student.suspensionReason ??
              "Existe uma mensalidade pendente no seu acompanhamento."}{" "}
            Assim que o pagamento for confirmado, seu acesso é liberado
            automaticamente.
          </p>
          <Button
            onClick={() => router.push("/aluno/chat")}
            className="mt-6 w-full"
          >
            Falar com o profissional
          </Button>
          <Button
            kind="outline"
            onClick={() =>
              createClient()
                .auth.signOut()
                .then(() => router.push("/login"))
            }
            className="mt-3 w-full"
          >
            Sair da conta
          </Button>
        </section>
      </main>
    );
  return (
    <AppFrame profile={viewer.role}>
      <SubscriptionBanner viewer={viewer} pathname={pathname} />
      {viewer.role === "professional" && coachAccess(viewer.subscription).state === "expired" && isLockedPath(pathname)
        ? <SubscriptionLocked />
        : <RouteContent pathname={pathname} viewer={viewer} inviteToken={searchParams.get("convite")} />}
    </AppFrame>
  );
}

function RouteContent({ pathname, viewer, inviteToken }: { pathname: string; viewer: Viewer; inviteToken: string | null }) {
  if (pathname === "/aluno") return <StudentHomePage viewer={viewer} />;
  if (pathname === "/aluno/dieta") return <DietPage viewer={viewer} />;
  if (pathname === "/aluno/treino" || pathname.startsWith("/aluno/treino/"))
    return <WorkoutLogbookPage viewer={viewer} />;
  if (pathname === "/aluno/comunidade" || pathname === "/profissional/comunidade")
    return <FeedPage viewer={viewer} />;
  if (pathname === "/conquistas") return <AchievementsPage viewer={viewer} />;
  if (pathname === "/aluno/preparacao") return <PrepPage viewer={viewer} />;
  if (pathname === "/ranking") return <RankingPage viewer={viewer} />;
  if (pathname === "/eventos") return <EventsPage viewer={viewer} />;
  if (pathname === "/eventos/novo") return <EventFormPage key="novo" viewer={viewer} />;
  if (pathname.startsWith("/eventos/")) {
    const [, , eventId, action] = pathname.split("/");
    if (action === "editar") return <EventFormPage key={`editar-${eventId}`} viewer={viewer} eventId={eventId} />;
    return <EventDetailPage key={eventId} viewer={viewer} eventId={eventId} />;
  }
  if (pathname.startsWith("/u/"))
    return <ProfilePage key={pathname} viewer={viewer} profileId={pathname.split("/")[2] === "me" ? viewer.id : pathname.split("/")[2] ?? ""} />;
  if (pathname === "/aluno/check-in") return <CheckinPage viewer={viewer} />;
  if (pathname === "/aluno/evolucao") return <EvolutionPage viewer={viewer} />;
  if (pathname === "/aluno/cardio") return <CardioPage viewer={viewer} />;
  if (pathname === "/aluno/habitos") return <HabitsPage viewer={viewer} />;
  if (pathname === "/aluno/perfil")
    return (
      <StudentProfilePage viewer={viewer} inviteToken={inviteToken} />
    );
  if (pathname === "/aluno/chat" || pathname === "/profissional/chat")
    return <ChatPage viewer={viewer} />;
  if (pathname === "/profissional")
    return <LiveProfessionalDashboard viewer={viewer} />;
  if (pathname === "/profissional/financeiro")
    return <ProfessionalFinancePage viewer={viewer} />;
  if (pathname === "/treinadores") return <CoachDirectory viewer={viewer} />;
  if (pathname.startsWith("/treinadores/"))
    return <CoachPage key={pathname} viewer={viewer} coachId={pathname.split("/")[2] ?? ""} />;
  if (pathname === "/profissional/portfolio") return <PortfolioEditor viewer={viewer} />;
  if (pathname === "/profissional/assinatura")
    return <BillingPage viewer={viewer} />;
  if (pathname === "/profissional/crm")
    return <ProfessionalCrmPage viewer={viewer} />;
  if (pathname === "/profissional/modelos")
    return <ProfessionalTemplatesPage viewer={viewer} />;
  if (pathname === "/profissional/biblioteca/exercicios")
    return <ProfessionalLibraryPage viewer={viewer} />;
  if (pathname === "/profissional/configuracoes")
    return <ProfessionalSettingsPage viewer={viewer} />;
  if (pathname === "/profissional/check-ins")
    return <CoachCheckinsPage viewer={viewer} />;
  if (pathname === "/profissional/alunos")
    return <StudentsPage viewer={viewer} />;
  if (pathname.startsWith("/profissional/alunos/"))
    return (
      <LiveProfessionalStudentPage
        viewer={viewer}
        studentId={pathname.split("/").filter(Boolean).at(-1) ?? ""}
      />
    );
  if (
    pathname === "/profissional/treinos" ||
    pathname === "/profissional/treinos/novo"
  )
    return <PlanBuilder key="workout" viewer={viewer} kind="workout" />;
  if (
    pathname === "/profissional/dietas" ||
    pathname === "/profissional/dietas/nova"
  )
    return <PlanBuilder key="diet" viewer={viewer} kind="diet" />;
  return <NotFound viewer={viewer} />;
}

function NotFound({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const home = viewer.role === "professional" ? "/profissional" : "/aluno";
  return (
    <Shell profile={viewer.role}>
      <PageTitle
        kicker="PÁGINA NÃO ENCONTRADA"
        title="Esse endereço não existe"
        text="O link pode estar desatualizado ou a página foi movida."
      />
      <Button onClick={() => router.replace(home)} className="mt-6">
        Voltar para o início
      </Button>
    </Shell>
  );
}
