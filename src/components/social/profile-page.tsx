"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Camera, Check, Lock, MessageCircle, Pencil, Trophy, UserCheck, UserPlus } from "lucide-react";
import { Button, Shell } from "@/components/app-shell";
import { AchievementBadge } from "@/components/social/achievement-badge";
import { FramedAvatar } from "@/components/social/framed-avatar";
import { PostCard } from "@/components/social/post-card";
import { ProgressBar } from "@/components/ui/motion";
import type { Viewer } from "@/lib/evolink-data";
import {
  getAchievementCatalog,
  getFeed,
  getPublicProfile,
  levelFor,
  setFollow,
  updateSocialProfile,
  uploadAvatar,
  type Achievement,
  type FeedPost,
  type Frame,
  type PublicProfile,
} from "@/lib/social-data";

const card = "rounded-3xl border border-[#e2ece6] bg-white p-5 soft-shadow";

export function ProfilePage({ viewer, profileId }: { viewer: Viewer; profileId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<{ achievements: Achievement[]; frames: Frame[] }>({ achievements: [], frames: [] });
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [editing, setEditing] = useState(false);
  const own = profileId === viewer.id;

  useEffect(() => {
    let active = true;
    Promise.all([getPublicProfile(profileId, viewer.id), getAchievementCatalog(), getFeed(viewer.id, { authorId: profileId })]).then(([profileResult, catalogResult, feed]) => {
      if (!active) return;
      setProfile(profileResult.profile);
      setCatalog(catalogResult);
      setPosts(feed.posts);
    });
    return () => { active = false; };
  }, [profileId, viewer.id]);

  if (profile === undefined) return <Shell profile={viewer.role}><div className="mx-auto mt-6 h-72 max-w-2xl animate-pulse rounded-3xl bg-white soft-shadow" /></Shell>;
  if (profile === null)
    return (
      <Shell profile={viewer.role}>
        <section className={`${card} mx-auto mt-10 max-w-md text-center`}>
          <h1 className="text-xl font-bold">Perfil não encontrado</h1>
          <p className="mt-2 text-sm text-[#71837b]">Ele pode ser privado ou não existir mais.</p>
          <Button onClick={() => router.back()} className="mt-5">Voltar</Button>
        </section>
      </Shell>
    );

  const earnedCodes = new Set(profile.earned.map(item => item.code));
  const earned = catalog.achievements.filter(item => earnedCodes.has(item.code));
  const points = earned.reduce((total, item) => total + item.points, 0);
  const level = levelFor(points);
  const showcase = [...earned].sort((a, b) => b.points - a.points).slice(0, 6);

  return (
    <Shell profile={viewer.role}>
      <div className="mx-auto max-w-2xl">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-[#087a50]"><ArrowLeft size={16} />Voltar</button>
        <section className="relative mt-4 overflow-hidden rounded-3xl border border-[#e2ece6] bg-white soft-shadow">
          <div className="h-28 bg-gradient-to-r from-[#07352b] via-[#087a50] to-[#2bb673]" />
          <div className="px-5 pb-5">
            <div className="-mt-12 flex items-end justify-between gap-3">
              <FramedAvatar author={profile.author} size="xl" />
              <div className="flex gap-2 pb-1">
                {own ? (
                  <Button kind="outline" onClick={() => setEditing(true)} className="px-4 py-2 text-sm"><Pencil size={15} />Editar perfil</Button>
                ) : (
                  <>
                    <FollowButton viewerId={viewer.id} profileId={profileId} following={profile.viewerFollows} onChange={following => setProfile(current => current && { ...current, viewerFollows: following, followers: current.followers + (following ? 1 : -1) })} />
                    {viewer.counterpart?.id === profileId && <Button kind="outline" onClick={() => router.push("/aluno/chat")} className="px-3 py-2"><MessageCircle size={16} /></Button>}
                  </>
                )}
              </div>
            </div>
            <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold tracking-tight">
              {profile.author.name}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${profile.role === "professional" ? "bg-[#07352b] text-[#b8e986]" : "bg-[#e7f4ec] text-[#087a50]"}`}>{profile.role === "professional" ? "Treinador" : "Atleta"}</span>
            </h1>
            {profile.bio && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#40564e]">{profile.bio}</p>}
            <div className="mt-4 flex gap-5 text-sm">
              <span><b>{profile.posts}</b> <span className="text-[#71837b]">posts</span></span>
              <span><b>{profile.followers}</b> <span className="text-[#71837b]">seguidores</span></span>
              <span><b>{profile.following}</b> <span className="text-[#71837b]">seguindo</span></span>
            </div>
          </div>
        </section>

        {profile.role === "student" && (
          <section className={`${card} mt-4`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[.12em] text-[#71837b]">NÍVEL {level.level}</p>
                <p className="text-lg font-bold">{points} pontos · {earned.length} medalhas</p>
              </div>
              {own && <Button kind="soft" onClick={() => router.push("/conquistas")} className="px-3 py-2 text-xs"><Trophy size={15} />Ver todas</Button>}
            </div>
            <div className="mt-3"><ProgressBar value={level.progress} className="bg-gradient-to-r from-[#087a50] to-[#b8e986]" /></div>
            <p className="mt-1.5 text-xs text-[#71837b]">{level.toNext} pontos para o nível {level.level + 1}</p>
            {showcase.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {showcase.map(item => <AchievementBadge key={item.code} achievement={item} earned size="sm" />)}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#71837b]">Nenhuma medalha ainda.</p>
            )}
          </section>
        )}

        <h2 className="mt-7 font-bold">Publicações</h2>
        {posts === null ? (
          <div className="mt-3 h-40 animate-pulse rounded-3xl bg-white soft-shadow" />
        ) : posts.length === 0 ? (
          <p className="mt-3 rounded-3xl border border-dashed border-[#cfe3d8] bg-white p-6 text-center text-sm text-[#71837b]">Nenhuma publicação visível.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {posts.map(post => <PostCard key={post.id} post={post} viewerId={viewer.id} achievements={catalog.achievements} onDeleted={id => setPosts(current => (current ?? []).filter(item => item.id !== id))} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <EditProfile
            profile={profile}
            frames={catalog.frames}
            earnedCodes={earnedCodes}
            achievements={catalog.achievements}
            onClose={() => setEditing(false)}
            onSaved={next => { setProfile(next); setEditing(false); }}
          />
        )}
      </AnimatePresence>
    </Shell>
  );
}

function FollowButton({ viewerId, profileId, following, onChange }: { viewerId: string; profileId: string; following: boolean; onChange: (following: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      kind={following ? "outline" : "primary"}
      disabled={busy}
      onClick={async () => { setBusy(true); const { error } = await setFollow(viewerId, profileId, !following); setBusy(false); if (!error) onChange(!following); }}
      className="px-4 py-2 text-sm"
    >
      {following ? <><UserCheck size={16} />Seguindo</> : <><UserPlus size={16} />Seguir</>}
    </Button>
  );
}

function EditProfile({ profile, frames, earnedCodes, achievements, onClose, onSaved }: {
  profile: PublicProfile;
  frames: Frame[];
  earnedCodes: Set<string>;
  achievements: Achievement[];
  onClose: () => void;
  onSaved: (profile: PublicProfile) => void;
}) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.author.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [frame, setFrame] = useState(profile.author.frame);
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [avatar, setAvatar] = useState(profile.author.avatarUrl);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function pickAvatar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) return setError("Use uma imagem de até 3 MB.");
    setUploading(true);
    const { error: uploadError, url } = await uploadAvatar(profile.author.id, file);
    setUploading(false);
    if (uploadError) return setError("Não foi possível enviar a foto.");
    setAvatar(url);
  }

  async function save() {
    if (name.trim().length < 2) return setError("Informe um nome.");
    setSaving(true);
    const { error: saveError } = await updateSocialProfile(profile.author.id, { displayName: name, bio, frame, isPublic });
    setSaving(false);
    if (saveError) return setError(saveError.message.includes("Moldura") ? "Essa moldura ainda não foi desbloqueada." : "Não foi possível salvar.");
    onSaved({ ...profile, bio: bio.trim() || null, isPublic, author: { ...profile.author, name: name.trim(), frame, avatarUrl: avatar } });
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#07352b]/40 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        onClick={event => event.stopPropagation()}
        initial={reduceMotion ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <h2 className="text-lg font-bold">Editar perfil</h2>
        <div className="mt-5 flex items-center gap-4">
          <button onClick={() => inputRef.current?.click()} className="group relative" aria-label="Trocar foto">
            <FramedAvatar author={{ name, avatarUrl: avatar, frame }} size="lg" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">{uploading ? "..." : <Camera size={20} />}</span>
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => pickAvatar(event.target.files?.[0])} className="hidden" />
          <p className="text-sm text-[#71837b]">Toque na foto para trocar. JPG, PNG ou WebP até 3 MB.</p>
        </div>
        <label className="mt-5 block text-sm font-bold">Nome<input value={name} onChange={event => setName(event.target.value)} maxLength={80} className="mt-1.5 w-full rounded-xl border border-[#dbe7e0] px-4 py-3 text-sm font-normal outline-none focus:border-[#087a50]" /></label>
        <label className="mt-4 block text-sm font-bold">Bio<textarea value={bio} onChange={event => setBio(event.target.value)} maxLength={240} placeholder="Categoria, objetivo, títulos..." className="mt-1.5 min-h-20 w-full rounded-xl border border-[#dbe7e0] px-4 py-3 text-sm font-normal outline-none focus:border-[#087a50]" /></label>
        <p className="mt-5 text-sm font-bold">Moldura</p>
        <div className="mt-2 grid grid-cols-4 gap-3">
          {frames.map(option => {
            const unlocked = !option.required_achievement || earnedCodes.has(option.required_achievement);
            const requirement = achievements.find(item => item.code === option.required_achievement);
            return (
              <button
                key={option.code}
                onClick={() => unlocked && setFrame(option.code)}
                disabled={!unlocked}
                title={unlocked ? option.title : `Desbloqueie com: ${requirement?.title ?? ""}`}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition ${frame === option.code ? "border-[#087a50] bg-[#e7f4ec]" : "border-[#e2ece6]"} ${unlocked ? "" : "opacity-50"}`}
              >
                <FramedAvatar author={{ name, avatarUrl: avatar, frame: option.code }} size="sm" />
                <span className="text-[11px] font-semibold leading-tight">{option.title}</span>
                {!unlocked && <Lock size={12} className="absolute right-1.5 top-1.5 text-[#91a39b]" />}
                {frame === option.code && <Check size={12} className="absolute right-1.5 top-1.5 text-[#087a50]" />}
              </button>
            );
          })}
        </div>
        <label className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[#f7faf8] p-4 text-sm">
          <span><b>Perfil público</b><br /><span className="text-[#71837b]">Outras pessoas podem te encontrar e seguir.</span></span>
          <input type="checkbox" checked={isPublic} onChange={event => setIsPublic(event.target.checked)} className="h-5 w-5 accent-[#087a50]" />
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-[#b94242]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button kind="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || uploading}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
