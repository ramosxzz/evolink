"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MessageCircle, Send } from "lucide-react";
import { Avatar, Button, PageTitle, Shell } from "@/components/app-shell";
import { getMessages, getProfessionalStudents, sendMessage, type Viewer } from "@/lib/evolink-data";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };
type Contact = { id: string; name: string; detail: string };

export function ChatPage({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isProfessional = viewer.role === "professional";
  const [studentList, setStudentList] = useState<Contact[] | null>(null);
  const contacts = useMemo<Contact[] | null>(() => {
    if (isProfessional) return studentList;
    return viewer.counterpart ? [{ id: viewer.counterpart.id, name: viewer.counterpart.fullName, detail: "Seu profissional" }] : [];
  }, [isProfessional, studentList, viewer.counterpart]);
  const selectedId = isProfessional
    ? (searchParams.get("aluno") ?? contacts?.[0]?.id ?? null)
    : (viewer.counterpart?.id ?? null);

  useEffect(() => {
    if (!isProfessional) return;
    getProfessionalStudents(viewer.id).then(students =>
      setStudentList(students.map(student => ({
        id: student.student_id,
        name: (student.profiles as { full_name?: string } | null)?.full_name ?? "Aluno",
        detail: (student.student_profiles as { goal?: string | null } | null)?.goal ?? "Aluno ativo",
      }))),
    );
  }, [isProfessional, viewer.id]);

  const selected = contacts?.find(contact => contact.id === selectedId) ?? null;
  const selectContact = (id: string) => router.replace(`/profissional/chat?aluno=${id}`, { scroll: false });

  return (
    <Shell profile={isProfessional ? "professional" : "student"}>
      <PageTitle
        kicker="CONVERSA"
        title={isProfessional ? "Mensagens" : (selected?.name ?? "Acompanhamento")}
        text={isProfessional ? "Converse com cada aluno em um só lugar." : "Mensagens protegidas entre você e seu profissional."}
      />
      {contacts === null ? (
        <div className="mt-7 h-96 animate-pulse rounded-3xl bg-white soft-shadow" />
      ) : contacts.length === 0 ? (
        <EmptyState isProfessional={isProfessional} onInvite={() => router.push("/profissional")} />
      ) : (
        <section className={`mt-7 grid overflow-hidden rounded-3xl border border-[#e2ece6] bg-white soft-shadow ${isProfessional ? "md:grid-cols-[260px_1fr]" : ""}`}>
          {isProfessional && (
            <ContactList contacts={contacts} selectedId={selectedId} onSelect={selectContact} />
          )}
          {selected ? <Conversation key={selected.id} viewer={viewer} contact={selected} /> : null}
        </section>
      )}
    </Shell>
  );
}

function ContactList({ contacts, selectedId, onSelect }: { contacts: Contact[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <aside className="flex gap-2 overflow-x-auto border-b border-[#edf2ef] p-3 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
      {contacts.map(contact => {
        const active = contact.id === selectedId;
        return (
          <button
            key={contact.id}
            onClick={() => onSelect(contact.id)}
            className={`flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition md:w-full ${active ? "bg-[#e7f4ec] text-[#075f3f]" : "hover:bg-[#f3f8f5]"}`}
          >
            <Avatar name={contact.name} className="h-9 w-9 text-xs" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{contact.name}</span>
              <span className="block truncate text-xs text-[#71837b]">{contact.detail}</span>
            </span>
          </button>
        );
      })}
    </aside>
  );
}

function Conversation({ viewer, contact }: { viewer: Viewer; contact: Contact }) {
  const reduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getMessages(viewer, contact.id).then(rows => { if (active) setMessages(rows); });
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${viewer.id}:${contact.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
        const message = payload.new as Message;
        const belongs =
          (message.sender_id === viewer.id && message.recipient_id === contact.id) ||
          (message.sender_id === contact.id && message.recipient_id === viewer.id);
        if (belongs) append(message);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [viewer, contact.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [messages, reduceMotion]);

  function append(message: Message) {
    setMessages(previous => (previous ?? []).some(item => item.id === message.id) ? previous : [...(previous ?? []), message]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setError("");
    const { data, error: sendError } = await sendMessage(viewer, body, contact.id);
    setSending(false);
    if (sendError) return setError("Não foi possível enviar. Tente novamente.");
    if (data) append(data as Message);
    setBody("");
  }

  const groups = useMemo(() => groupByDay(messages ?? []), [messages]);

  return (
    <div className="flex min-h-[28rem] flex-col">
      <header className="flex items-center gap-3 border-b border-[#edf2ef] px-5 py-3.5">
        <Avatar name={contact.name} className="h-9 w-9 text-xs" />
        <div>
          <p className="text-sm font-bold">{contact.name}</p>
          <p className="text-xs text-[#71837b]">{contact.detail}</p>
        </div>
      </header>
      <div className="max-h-[60vh] flex-1 space-y-4 overflow-y-auto bg-[#fbfdfc] p-5">
        {messages === null && <div className="space-y-3"><Skeleton className="h-10 w-2/3 rounded-2xl" /><Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" /><Skeleton className="h-14 w-3/5 rounded-2xl" /></div>}
        {messages?.length === 0 && (
          <div className="grid place-items-center py-12 text-center text-sm text-[#71837b]">
            <MessageCircle className="mb-2 text-[#9cc7b1]" />
            Envie a primeira mensagem para {contact.name.split(" ")[0]}.
          </div>
        )}
        {groups.map(group => (
          <div key={group.day} className="space-y-2">
            <p className="text-center text-[11px] font-bold uppercase tracking-[.12em] text-[#91a39b]">{group.day}</p>
            <AnimatePresence initial={false}>
              {group.items.map(message => {
                const mine = message.sender_id === viewer.id;
                return (
                  <motion.div
                    key={message.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={`w-fit max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${mine ? "ml-auto rounded-br-md bg-[#087a50] text-white" : "rounded-bl-md bg-white text-[#285248] shadow-sm"}`}
                  >
                    {message.body}
                    <p className={`mt-1 text-right text-[10px] ${mine ? "text-emerald-100" : "text-[#91a39b]"}`}>
                      {new Date(message.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-[#edf2ef] p-3">
        <input
          value={body}
          onChange={event => setBody(event.target.value)}
          placeholder="Escreva uma mensagem"
          maxLength={2000}
          className="flex-1 rounded-xl bg-[#f3f8f5] px-4 py-3 text-sm outline-none transition focus:ring-4 focus:ring-[#dff3e7]"
        />
        <Button type="submit" disabled={sending || !body.trim()}>
          <Send size={17} />
        </Button>
      </form>
      {error && <p className="px-4 pb-4 text-sm font-semibold text-[#b94242]">{error}</p>}
    </div>
  );
}

function EmptyState({ isProfessional, onInvite }: { isProfessional: boolean; onInvite: () => void }) {
  return (
    <section className="mt-7 rounded-3xl border border-dashed border-[#cfe3d8] bg-white p-8 text-center">
      <MessageCircle className="mx-auto text-[#9cc7b1]" />
      <h2 className="mt-3 text-lg font-bold">{isProfessional ? "Nenhum aluno ativo ainda" : "Nenhum profissional vinculado"}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#71837b]">
        {isProfessional
          ? "Convide um aluno pelo painel para começar a conversar."
          : "Peça ao seu profissional o link de convite. O chat é liberado assim que o vínculo estiver ativo."}
      </p>
      {isProfessional && <Button onClick={onInvite} className="mt-5">Convidar aluno</Button>}
    </section>
  );
}

function groupByDay(messages: Message[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const groups: { day: string; items: Message[] }[] = [];
  for (const message of messages) {
    const date = new Date(message.created_at);
    const key = date.toDateString();
    const day = key === today ? "Hoje" : key === yesterday ? "Ontem" : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(message);
    else groups.push({ day, items: [message] });
  }
  return groups;
}
