"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Link2, LogOut, Target, UserRound } from "lucide-react";
import { Avatar, Button, PageTitle, Shell } from "@/components/app-shell";
import { Reveal } from "@/components/ui/motion";
import { changePassword, getStudentAccount, redeemProfessionalInvite, saveStudentAccount, type Viewer } from "@/lib/evolink-data";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/select";

const card = "rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow";
const field = "mt-1.5 w-full rounded-xl border border-[#dbe7e0] bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]";
const goals = ["Redução de gordura", "Ganho de massa", "Recomposição corporal", "Preparação para campeonato", "Performance", "Qualidade de vida"];

type Feedback = { kind: "success" | "error"; text: string } | null;

export function StudentProfilePage({ viewer, inviteToken }: { viewer: Viewer; inviteToken: string | null }) {
  const router = useRouter();

  return (
    <Shell profile="student">
      <PageTitle kicker="PERFIL" title="Sua conta" text="Seus dados, objetivos e segurança." />
      <Reveal index={0} className={`${card} mt-7 flex items-center gap-4`}>
        <Avatar name={viewer.fullName} className="h-16 w-16 text-lg" />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold">{viewer.fullName}</h2>
          <p className="text-sm text-[#71837b]">{viewer.student?.goal ?? "Objetivo ainda não definido"}</p>
        </div>
      </Reveal>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Reveal index={1}><AccountForm viewer={viewer} /></Reveal>
        <div className="space-y-4">
          <Reveal index={2}><CoachLink viewer={viewer} inviteToken={inviteToken} /></Reveal>
          <Reveal index={3}><PasswordForm /></Reveal>
          <Reveal index={4}>
            <Button
              kind="outline"
              className="w-full text-[#b94242]"
              onClick={() => createClient().auth.signOut().then(() => router.replace("/login"))}
            >
              <LogOut size={16} />Sair da conta
            </Button>
          </Reveal>
        </div>
      </div>
    </Shell>
  );
}

function AccountForm({ viewer }: { viewer: Viewer }) {
  const [values, setValues] = useState<{ fullName: string; phone: string; goal: string; target: string; water: string } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getStudentAccount(viewer.id).then(({ profile, student }) => {
      if (!active) return;
      setValues({
        fullName: profile?.full_name ?? viewer.fullName,
        phone: profile?.phone ?? "",
        goal: student?.goal ?? "",
        target: student?.target_weight_kg ? String(student.target_weight_kg).replace(".", ",") : "",
        water: String((student?.daily_water_goal_ml ?? 2500) / 1000).replace(".", ","),
      });
    });
    return () => { active = false; };
  }, [viewer.id, viewer.fullName]);

  if (!values) return <div className={`${card} h-96 animate-pulse`} />;
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues(current => current && { ...current, [key]: event.target.value });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!values) return;
    if (values.fullName.trim().length < 2) return setFeedback({ kind: "error", text: "Informe seu nome." });
    const target = values.target ? Number(values.target.replace(",", ".")) : null;
    if (target !== null && (target < 30 || target > 300)) return setFeedback({ kind: "error", text: "Peso meta inválido." });
    const water = Math.round(Number(values.water.replace(",", ".")) * 1000);
    if (!water || water < 500 || water > 10000) return setFeedback({ kind: "error", text: "Meta de água entre 0,5 e 10 litros." });
    setSaving(true);
    const { error } = await saveStudentAccount(viewer.id, { fullName: values.fullName, phone: values.phone, goal: values.goal, targetWeightKg: target, waterGoalMl: water });
    setSaving(false);
    setFeedback(error ? { kind: "error", text: "Não foi possível salvar." } : { kind: "success", text: "Dados atualizados." });
  }

  return (
    <form onSubmit={submit} className={`${card} h-full`}>
      <h3 className="flex items-center gap-2 font-bold"><UserRound size={18} className="text-[#087a50]" />Dados pessoais</h3>
      <label className="mt-4 block text-sm font-bold">Nome completo<input value={values.fullName} onChange={set("fullName")} autoComplete="name" className={field} /></label>
      <label className="mt-4 block text-sm font-bold">Telefone<input value={values.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" placeholder="(11) 99999-9999" className={field} /></label>
      <h3 className="mt-7 flex items-center gap-2 font-bold"><Target size={18} className="text-[#087a50]" />Objetivos</h3>
      <div className="mt-4">
        <Select
          label="Objetivo principal"
          value={values.goal}
          onChange={goal => setValues(current => current && { ...current, goal })}
          options={[...goals, ...(values.goal && !goals.includes(values.goal) ? [values.goal] : [])].map(goal => ({ value: goal, label: goal }))}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">Peso meta (kg)<input value={values.target} onChange={set("target")} inputMode="decimal" placeholder="Opcional" className={field} /></label>
        <label className="text-sm font-bold">Água por dia (L)<input value={values.water} onChange={set("water")} inputMode="decimal" className={field} /></label>
      </div>
      <FeedbackLine feedback={feedback} />
      <Button type="submit" disabled={saving} className="mt-5 w-full">{saving ? "Salvando..." : "Salvar alterações"}</Button>
    </form>
  );
}

function CoachLink({ viewer, inviteToken }: { viewer: Viewer; inviteToken: string | null }) {
  const router = useRouter();
  const [token, setToken] = useState(inviteToken ?? "");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  async function accept() {
    const match = token.match(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i);
    if (!match) return setFeedback({ kind: "error", text: "Cole o código ou link completo do convite." });
    setSaving(true);
    const { error } = await redeemProfessionalInvite(match[0]);
    setSaving(false);
    if (error) return setFeedback({ kind: "error", text: error.message });
    setFeedback({ kind: "success", text: "Convite aceito! Seu profissional já pode acompanhar sua rotina." });
    window.setTimeout(() => router.push("/aluno"), 1200);
  }

  return (
    <section className={card}>
      <h3 className="flex items-center gap-2 font-bold"><Link2 size={18} className="text-[#087a50]" />Acompanhamento</h3>
      {viewer.counterpart ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#e7f4ec] p-4">
          <Avatar name={viewer.counterpart.fullName} className="h-10 w-10 text-xs" />
          <div>
            <p className="text-sm font-bold text-[#176340]">{viewer.counterpart.fullName}</p>
            <p className="text-xs text-[#3f7a5d]">Seu profissional</p>
          </div>
          <Button kind="outline" className="ml-auto px-3 py-2 text-xs" onClick={() => router.push("/aluno/chat")}>Conversar</Button>
        </div>
      ) : (
        <>
          <label className="mt-4 block text-sm font-bold">Código ou link do convite
            <input value={token} onChange={event => setToken(event.target.value)} placeholder="Cole o link recebido" className={field} />
          </label>
          <Button onClick={accept} disabled={saving} className="mt-4 w-full">{saving ? "Vinculando..." : "Vincular profissional"}</Button>
        </>
      )}
      <FeedbackLine feedback={feedback} />
    </section>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setFeedback({ kind: "error", text: "A senha precisa ter pelo menos 8 caracteres." });
    if (password !== confirm) return setFeedback({ kind: "error", text: "As senhas não conferem." });
    setSaving(true);
    const { error } = await changePassword(password);
    setSaving(false);
    if (error) return setFeedback({ kind: "error", text: error.message.includes("different") ? "A nova senha precisa ser diferente da atual." : "Não foi possível trocar a senha." });
    setPassword(""); setConfirm("");
    setFeedback({ kind: "success", text: "Senha alterada." });
  }

  return (
    <form onSubmit={submit} className={card}>
      <h3 className="flex items-center gap-2 font-bold"><KeyRound size={18} className="text-[#087a50]" />Trocar senha</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Nova senha<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" className={field} /></label>
        <label className="text-sm font-bold">Confirmar<input type="password" value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" className={field} /></label>
      </div>
      <FeedbackLine feedback={feedback} />
      <Button type="submit" kind="outline" disabled={saving || !password} className="mt-4 w-full">{saving ? "Salvando..." : "Atualizar senha"}</Button>
    </form>
  );
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p role="status" className={`mt-4 flex items-center gap-2 text-sm font-semibold ${feedback.kind === "success" ? "text-[#087a50]" : "text-[#b94242]"}`}>
      {feedback.kind === "success" && <CheckCircle2 size={16} />}{feedback.text}
    </p>
  );
}
