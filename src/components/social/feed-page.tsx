"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Globe2, ImagePlus, Lock, Search, Sparkles, Users, X } from "lucide-react";
import { Button, PageTitle, Shell } from "@/components/app-shell";
import { FramedAvatar } from "@/components/social/framed-avatar";
import { PostCard } from "@/components/social/post-card";
import type { Viewer } from "@/lib/evolink-data";
import { createPost, getAchievementCatalog, getFeed, getPublicProfile, searchProfiles, type Achievement, type Author, type FeedPost, type Visibility } from "@/lib/social-data";
import { Select } from "@/components/ui/select";

type Tab = "community" | "following";

export function FeedPage({ viewer }: { viewer: Viewer }) {
  const [tab, setTab] = useState<Tab>("community");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [me, setMe] = useState<Author | null>(null);

  useEffect(() => {
    let active = true;
    getAchievementCatalog().then(result => { if (active) setAchievements(result.achievements); });
    getPublicProfile(viewer.id, viewer.id).then(result => { if (active && result.profile) setMe(result.profile.author); });
    return () => { active = false; };
  }, [viewer.id]);

  return (
    <Shell profile={viewer.role}>
      <div className="mx-auto max-w-2xl">
        <PageTitle kicker="COMUNIDADE" title="Feed" text="Treinos, fotos e conquistas de quem está evoluindo com você." />
        <PeopleSearch />
        <div className="mt-5 flex gap-1 rounded-2xl bg-[#eaf2ee] p-1">
          {([["community", "Comunidade", Globe2], ["following", "Seguindo", Users]] as const).map(([value, label, Icon]) => (
            <button key={value} onClick={() => setTab(value)} className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${tab === value ? "text-[#07352b]" : "text-[#71837b]"}`}>
              {tab === value && <motion.span layoutId="feed-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative flex items-center gap-2"><Icon size={16} />{label}</span>
            </button>
          ))}
        </div>
        <Composer viewer={viewer} me={me} />
        <FeedList key={tab} viewer={viewer} tab={tab} achievements={achievements} />
      </div>
    </Shell>
  );
}

function FeedList({ viewer, tab, achievements }: { viewer: Viewer; tab: Tab; achievements: Achievement[] }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getFeed(viewer.id, tab).then(result => {
      if (!active) return;
      setPosts(result.posts);
      setHasMore(result.hasMore);
    });
    const onPosted = () => getFeed(viewer.id, tab).then(result => { if (active) { setPosts(result.posts); setHasMore(result.hasMore); } });
    window.addEventListener("evolink:posted", onPosted);
    return () => { active = false; window.removeEventListener("evolink:posted", onPosted); };
  }, [viewer.id, tab]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingMore || !posts?.length) return;
      setLoadingMore(true);
      const result = await getFeed(viewer.id, tab, posts.at(-1)!.createdAt);
      setPosts(current => [...(current ?? []), ...result.posts.filter(post => !current?.some(item => item.id === post.id))]);
      setHasMore(result.hasMore);
      setLoadingMore(false);
    }, { rootMargin: "400px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, posts, tab, viewer.id]);

  if (posts === null) return <div className="mt-4 space-y-4">{[0, 1, 2].map(item => <div key={item} className="h-48 animate-pulse rounded-3xl bg-white soft-shadow" />)}</div>;
  if (posts.length === 0)
    return (
      <section className="mt-4 rounded-3xl border border-dashed border-[#cfe3d8] bg-white p-8 text-center">
        <Sparkles className="mx-auto text-[#9cc7b1]" />
        <h2 className="mt-3 text-lg font-bold">{tab === "following" ? "Siga atletas para ver as publicações deles" : "Nada por aqui ainda"}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#71837b]">{tab === "following" ? "Use a busca acima para encontrar pessoas." : "Seja o primeiro a publicar um treino, uma foto ou uma conquista."}</p>
      </section>
    );

  return (
    <div className="mt-4 space-y-4">
      <AnimatePresence initial={false}>
        {posts.map(post => (
          <PostCard key={post.id} post={post} viewerId={viewer.id} achievements={achievements} onDeleted={id => setPosts(current => (current ?? []).filter(item => item.id !== id))} />
        ))}
      </AnimatePresence>
      <div ref={sentinel} />
      {loadingMore && <div className="h-24 animate-pulse rounded-3xl bg-white soft-shadow" />}
      {!hasMore && posts.length > 5 && <p className="py-6 text-center text-sm text-[#91a39b]">Você chegou ao fim. 💪</p>}
    </div>
  );
}

function Composer({ viewer, me }: { viewer: Viewer; me: Author | null }) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("community");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  // Revoke previews on removal and on unmount (not on every change: kept items reuse their URL).
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => () => filesRef.current.forEach(item => URL.revokeObjectURL(item.url)), []);

  function pick(list: FileList | null) {
    if (!list) return;
    const images = [...list].filter(file => file.type.startsWith("image/") && file.size <= 25 * 1024 * 1024);
    if (images.length < list.length) setError("Use imagens de até 25 MB.");
    setFiles(current => [...current, ...images.map(file => ({ file, url: URL.createObjectURL(file) }))].slice(0, 4));
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    if (!text.trim() && !files.length) return;
    setPosting(true);
    setError("");
    const { error: postError } = await createPost(viewer.id, { caption: text, files: files.map(item => item.file), visibility });
    setPosting(false);
    if (postError) return setError("Não foi possível publicar. Tente novamente.");
    setText("");
    files.forEach(item => URL.revokeObjectURL(item.url));
    setFiles([]);
    setFocused(false);
    window.dispatchEvent(new Event("evolink:posted"));
  }

  const options: [Visibility, string, typeof Globe2][] = [["community", "Comunidade", Globe2], ["followers", "Seguidores", Users], ...(viewer.role === "student" ? [["coach", "Só meu treinador", Lock] as [Visibility, string, typeof Globe2]] : [])];
  const expanded = focused || text || files.length;

  return (
    <section className="mt-4 rounded-3xl border border-[#e2ece6] bg-white p-4 soft-shadow">
      <div className="flex gap-3">
        {me ? <FramedAvatar author={me} /> : <span className="h-12 w-12 shrink-0 rounded-full bg-[#edf2ef]" />}
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          onFocus={() => setFocused(true)}
          maxLength={500}
          rows={expanded ? 3 : 1}
          placeholder="Como foi o treino hoje?"
          className="flex-1 resize-none bg-transparent py-3 text-[15px] outline-none placeholder:text-[#9aaba3]"
        />
      </div>
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 grid grid-cols-4 gap-2">
            {files.map(item => (
              <div key={item.url} className="relative aspect-square overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                <img src={item.url} alt="Prévia" className="h-full w-full object-cover" />
                <button onClick={() => { URL.revokeObjectURL(item.url); setFiles(current => current.filter(entry => entry.url !== item.url)); }} aria-label="Remover foto" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X size={13} /></button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="mt-2 text-sm font-semibold text-[#b94242]">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#f0f4f2] pt-3">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => pick(event.target.files)} className="hidden" />
        <button onClick={() => inputRef.current?.click()} disabled={files.length >= 4} aria-label="Adicionar fotos" className="grid h-9 w-9 place-items-center rounded-full text-[#087a50] transition hover:bg-[#eef6f1] disabled:opacity-40"><ImagePlus size={19} /></button>
        <Select size="sm" className="w-44" value={visibility} onChange={value => setVisibility(value as Visibility)} options={options.map(([value, label]) => ({ value, label }))} />
        <span className={`ml-auto text-xs ${text.length > 450 ? "text-[#b94242]" : "text-[#91a39b]"}`}>{text.length ? `${text.length}/500` : ""}</span>
        <Button onClick={submit} disabled={posting || (!text.trim() && !files.length)} className="px-5 py-2">{posting ? "Publicando..." : "Publicar"}</Button>
      </div>
    </section>
  );
}

function PeopleSearch() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Author[]>([]);

  useEffect(() => {
    if (term.trim().length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => searchProfiles(term).then(rows => { if (active) setResults(rows); }), 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [term]);

  const visible = term.trim().length >= 2 ? results : [];
  return (
    <div className="relative mt-6">
      <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91a39b]" />
      <input value={term} onChange={event => setTerm(event.target.value)} placeholder="Encontrar atletas e treinadores" className="w-full rounded-2xl border border-[#dbe7e0] bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-[#087a50] focus:ring-4 focus:ring-[#dff3e7]" />
      <AnimatePresence>
        {visible.length > 0 && (
          <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-[#e2ece6] bg-white p-1 shadow-xl">
            {visible.map(person => (
              <li key={person.id}>
                <button onClick={() => router.push(`/u/${person.id}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#f3f8f5]">
                  <FramedAvatar author={person} size="sm" />
                  <span className="text-sm font-bold">{person.name}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
