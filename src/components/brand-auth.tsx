"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/app-shell";

type AuthPath = "/" | "/login" | "/cadastro" | "/recuperar-senha" | "/redefinir-senha";

export function BrandAuth({ path }: { path: AuthPath }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [accountRole, setAccountRole] = useState<"student" | "professional">("student");
  const signup = path === "/cadastro";
  const recovery = path === "/recuperar-senha";
  const reset = path === "/redefinir-senha";
  const recoveryVerified = useRef(false);

  async function submit(form: FormData) {
    setLoading(true); setFeedback(null);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const fullName = String(form.get("fullName") || "").trim();
    const supabase = createClient();
    try {
      if (recovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` });
        if (error) throw error;
        setFeedback({ kind: "success", message: "Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha." }); setSent(true); window.setTimeout(() => setSent(false), 2500); return;
      }
      if (reset) {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (password !== String(form.get("passwordConfirm") || "")) throw new Error("As senhas não conferem.");
        const tokenHash = new URLSearchParams(window.location.search).get("token_hash");
        if (tokenHash && !recoveryVerified.current) {
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (verifyError) throw new Error("expired");
          recoveryVerified.current = true;
        }
        const { data, error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        router.replace(profile?.role === "professional" ? "/profissional" : "/aluno");
        return;
      }
      if (signup) {
        if (fullName.length < 2) throw new Error("Informe seu nome completo.");
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role: accountRole }, emailRedirectTo: `${window.location.origin}/login` } });
        if (error) throw error;
        if (data.session) {
          router.replace(accountRole === "professional" ? "/profissional" : "/aluno");
          router.refresh();
          return;
        }
        setFeedback({ kind: "success", message: "Conta criada. Confira seu e-mail para confirmar o acesso." }); return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      router.push(profile?.role === "professional" ? "/profissional" : "/aluno");
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Não foi possível concluir a solicitação.";
      const message = rawMessage === "Invalid login credentials"
        ? "E-mail ou senha incorretos."
        : rawMessage.includes("already registered")
          ? "Este e-mail já possui uma conta. Entre com sua senha."
          : rawMessage.includes("rate limit")
            ? "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."
            : rawMessage.includes("session missing") || rawMessage.includes("expired")
              ? "Este link expirou ou já foi usado. Solicite um novo em Esqueci minha senha."
              : rawMessage.includes("should be different")
                ? "A nova senha precisa ser diferente da atual."
                : rawMessage;
      setFeedback({ kind: "error", message });
    }
    finally { setLoading(false); }
  }

  const ease = [0.22, 1, 0.36, 1] as const;
  // Slide only: starting at opacity 0 left the form invisible until hydration finished.
  const reveal = reduceMotion ? {} : { initial: { y: 18 }, animate: { y: 0 }, transition: { duration: .48, ease } };
  return <main className="grid min-h-[100dvh] bg-[#061d19] text-white lg:grid-cols-[1.15fr_.85fr]">
    <motion.section {...reveal} className="relative hidden overflow-hidden lg:block">
      <Image src="/brand/evolink-logo.png" alt="Evolink" fill priority sizes="(min-width: 1024px) 58vw, 0px" className="object-cover opacity-80" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#061d19_0%,rgba(6,29,25,.56)_48%,rgba(6,29,25,.16)_100%)]" />
      <div className="absolute inset-x-12 top-12 flex items-center gap-3"><span className="relative h-10 w-10 overflow-hidden rounded-2xl border border-emerald-300/40 bg-[#07352b]"><Image src="/brand/evolink-mark-192.png" alt="Evolink" fill sizes="40px" className="scale-125 object-cover"/></span><span className="text-xl font-bold tracking-tight">Evolink</span></div>
      <div className="absolute bottom-14 left-12 max-w-xl"><p className="text-sm font-bold uppercase tracking-[.22em] text-emerald-300">EVOLUÇÃO CONECTADA</p><h1 className="mt-4 text-5xl font-bold leading-[1.02] tracking-tight">Sua rotina tem um lugar para evoluir.</h1><p className="mt-5 max-w-md text-base leading-relaxed text-emerald-50/75">Treino, nutrição e acompanhamento profissional em uma experiência leve e pessoal.</p></div>
    </motion.section>
    <motion.section {...reveal} transition={{ delay: reduceMotion ? 0 : .1, duration: .48, ease }} className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f5faf7] px-5 py-10 text-[#09251f]">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#90e6a4]/45 blur-3xl" /><div className="absolute -bottom-20 -left-24 h-64 w-64 rounded-full bg-[#0ba273]/20 blur-3xl" />
      <div className="relative w-full max-w-[390px]">
        <button onClick={() => router.push("/")} className="mb-12 flex items-center gap-3 text-left"><span className="relative h-10 w-10 overflow-hidden rounded-2xl bg-[#07352b] shadow-lg shadow-emerald-950/20"><Image src="/brand/evolink-mark-192.png" alt="Evolink" fill sizes="40px" className="scale-125 object-cover"/></span><span className="text-xl font-bold tracking-tight">Evolink</span></button>
        <motion.p {...reveal} className="text-xs font-bold tracking-[.18em] text-[#07845a]">{reset ? "NOVA SENHA" : recovery ? "RECUPERAR ACESSO" : signup ? "COMECE AGORA" : "BEM-VINDO DE VOLTA"}</motion.p>
        <motion.h2 {...reveal} transition={{ delay: reduceMotion ? 0 : .05, duration: .48, ease }} className="mt-2 text-3xl font-bold tracking-tight">{reset ? "Defina sua nova senha." : recovery ? "Vamos te ajudar a entrar." : signup ? "Crie sua conta." : "Entre no seu ritmo."}</motion.h2>
        <p className="mt-3 text-sm leading-relaxed text-[#5f746d]">{reset ? "Escolha uma senha com pelo menos 8 caracteres." : recovery ? "Digite seu e-mail e enviaremos um link seguro." : signup ? "Seu primeiro passo para uma evolução sustentável." : "Acompanhe sua rotina e mantenha o foco no que importa."}</p>
        <form action={submit} className="mt-8 space-y-4">
          {signup && <><Input name="fullName" label="Nome completo" placeholder="Como podemos te chamar?" icon={UserRound} /><div><p className="mb-2 text-sm font-bold">Como você vai usar o Evolink?</p><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setAccountRole("student")} className={`rounded-xl border p-3 text-left text-sm font-bold ${accountRole === "student" ? "border-[#07845a] bg-[#e8f8ed] text-[#076841]" : "border-[#d6e4dc] bg-white text-[#5f746d]"}`}>Sou aluno</button><button type="button" onClick={() => setAccountRole("professional")} className={`rounded-xl border p-3 text-left text-sm font-bold ${accountRole === "professional" ? "border-[#07845a] bg-[#e8f8ed] text-[#076841]" : "border-[#d6e4dc] bg-white text-[#5f746d]"}`}>Sou profissional</button></div></div></>}
          {!reset && <Input name="email" label="E-mail" placeholder="voce@email.com" type="email" icon={Mail} />}
          {!recovery && <Input name="password" label={reset ? "Nova senha" : "Senha"} placeholder="Mínimo de 8 caracteres" type="password" icon={LockKeyhole} minLength={8} autoComplete={signup || reset ? "new-password" : "current-password"} />}
          {reset && <Input name="passwordConfirm" label="Confirme a nova senha" placeholder="Repita a senha" type="password" icon={LockKeyhole} minLength={8} autoComplete="new-password" />}
          {signup && <label className="flex gap-3 rounded-xl bg-white/70 p-3 text-xs leading-relaxed text-[#5f746d]"><input required type="checkbox" className="mt-0.5 accent-[#07845a]"/><span>Li e aceito os <a href="/termos#termos" target="_blank" rel="noreferrer" className="font-bold text-[#07845a] underline">termos de uso</a> e a <a href="/termos#privacidade" target="_blank" rel="noreferrer" className="font-bold text-[#07845a] underline">política de privacidade</a>.</span></label>}
          {!signup && !recovery && !reset && <div className="flex justify-end text-sm"><button type="button" onClick={() => router.push("/recuperar-senha")} className="font-bold text-[#07845a]">Esqueci minha senha</button></div>}
          <motion.button
            whileTap={reduceMotion || loading ? undefined : { scale: .96 }}
            animate={reduceMotion ? undefined : sent ? { scale: [1, 1.03, 1] } : loading ? { scale: .985 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            disabled={loading}
            aria-busy={loading || undefined}
            className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-950/15 transition-colors ${sent ? "bg-[#0a9463]" : "bg-[#07845a] hover:bg-[#066a49]"} ${loading ? "cursor-wait" : ""}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {loading ? (
                <motion.span key="loading" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2"><Spinner size={18} />{recovery ? "Enviando..." : reset ? "Salvando..." : signup ? "Criando conta..." : "Entrando..."}</motion.span>
              ) : sent ? (
                <motion.span key="sent" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><CheckCircle2 size={18} />{recovery ? "Link enviado" : "Pronto"}</motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2">{reset ? "Salvar nova senha" : recovery ? "Enviar link" : signup ? "Criar minha conta" : "Entrar no Evolink"}<ArrowRight size={17}/></motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>
        {feedback && <motion.p role="status" initial={reduceMotion ? false : { opacity: 0, scale: .96, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`mt-4 flex gap-2 rounded-xl border p-3 text-sm ${feedback.kind === "success" ? "border-[#b7dfca] bg-[#e8f8ed] text-[#176340]" : "border-[#efc9c5] bg-[#fff1ef] text-[#9b342c]"}`}>{feedback.kind === "success" ? <CheckCircle2 size={18} className="shrink-0"/> : <AlertCircle size={18} className="shrink-0"/>}{feedback.message}</motion.p>}
        {(recovery || reset) && <p className="mt-7 text-center text-sm text-[#5f746d]"><button onClick={() => router.push("/login")} className="font-bold text-[#07845a]">Voltar para o login</button></p>}
        {!recovery && !reset && <p className="mt-7 text-center text-sm text-[#5f746d]">{signup ? "Já tem uma conta?" : "Ainda não faz parte?"} <button onClick={() => router.push(signup ? "/login" : "/cadastro")} className="font-bold text-[#07845a]">{signup ? "Entrar" : "Criar conta"}</button></p>}
      </div>
    </motion.section>
  </main>;
}

function Input({ name, label, placeholder, type = "text", icon: Icon, minLength, autoComplete }: { name: string; label: string; placeholder: string; type?: string; icon: typeof Mail; minLength?: number; autoComplete?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span><span className="flex items-center gap-3 rounded-xl border border-[#d6e4dc] bg-white px-4 transition focus-within:border-[#07845a] focus-within:ring-4 focus-within:ring-[#d7f0df]"><Icon size={18} className="text-[#6e8a7e]"/><input required name={name} type={type} minLength={minLength} autoComplete={autoComplete ?? (type === "password" ? "current-password" : name === "email" ? "email" : "name")} placeholder={placeholder} className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[#9aaca4]"/></span></label>;
}
