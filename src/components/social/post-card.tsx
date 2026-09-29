"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Clock3, Dumbbell, Flame, Globe2, Heart, Lock, Medal, MessageCircle, MoreHorizontal, Send, Share2, Trash2, Users } from "lucide-react";
import { AchievementBadge } from "@/components/social/achievement-badge";
import { FramedAvatar } from "@/components/social/framed-avatar";
import { addComment, deleteComment, deletePost, getComments, setLike, type Achievement, type Comment, type FeedPost } from "@/lib/social-data";

const visibilityInfo = {
  community: { icon: Globe2, label: "Comunidade" },
  followers: { icon: Users, label: "Seguidores" },
  coach: { icon: Lock, label: "Só o treinador" },
} as const;

export function timeAgo(date: string) {
  const seconds = Math.max(0, (new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "agora";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)} d`;
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const formatDuration = (seconds: number) => `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}h ` : ""}${Math.round((seconds % 3600) / 60)}min`;
const formatVolume = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1).replace(".", ",")} t` : `${Math.round(kg)} kg`);

export function PostCard({ post, viewerId, achievements, onDeleted }: { post: FeedPost; viewerId: string; achievements: Achievement[]; onDeleted: (id: string) => void }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [liked, setLiked] = useState(post.likedByViewer);
  const [likes, setLikes] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [menu, setMenu] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const Visibility = visibilityInfo[post.visibility].icon;
  const achievement = post.achievementCode ? achievements.find(item => item.code === post.achievementCode) : undefined;
  const openProfile = () => router.push(`/u/${post.author.id}`);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes(count => count + (next ? 1 : -1));
    const { error } = await setLike(post.id, viewerId, next);
    if (error) { setLiked(!next); setLikes(count => count + (next ? -1 : 1)); }
  }

  async function share() {
    const text = post.caption ?? post.workout?.title ?? "Evolução no Evolink";
    if (navigator.share) await navigator.share({ title: "Evolink", text }).catch(() => undefined);
    else await navigator.clipboard?.writeText(text);
  }

  return (
    <motion.article layout initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="rounded-3xl border border-[#e2ece6] bg-white p-4 soft-shadow sm:p-5">
      <header className="flex items-center gap-3">
        <button onClick={openProfile} aria-label={`Ver perfil de ${post.author.name}`}><FramedAvatar author={post.author} /></button>
        <div className="min-w-0 flex-1">
          <button onClick={openProfile} className="block truncate text-left text-sm font-bold hover:underline">{post.author.name}</button>
          <p className="flex items-center gap-1.5 text-xs text-[#71837b]">{timeAgo(post.createdAt)} · <Visibility size={12} />{visibilityInfo[post.visibility].label}</p>
        </div>
        {post.author.id === viewerId && (
          <div className="relative">
            <button onClick={() => setMenu(value => !value)} aria-label="Opções do post" className="grid h-8 w-8 place-items-center rounded-full text-[#71837b] hover:bg-[#f3f8f5]"><MoreHorizontal size={18} /></button>
            <AnimatePresence>
              {menu && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute right-0 top-9 z-10 w-40 rounded-2xl border border-[#e2ece6] bg-white p-1 shadow-xl">
                  <button onClick={async () => { setMenu(false); const { error } = await deletePost(post.id); if (!error) onDeleted(post.id); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#b94242] hover:bg-[#fdebea]">
                    <Trash2 size={15} />Excluir post
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      {post.caption && <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#1d3b33]">{post.caption}</p>}

      {post.images.length > 0 && (
        <div className={`mt-3 grid gap-1.5 overflow-hidden rounded-2xl ${post.images.length === 1 ? "" : "grid-cols-2"}`}>
          {post.images.map((url, index) => (
            <button key={url} onClick={() => setLightbox(url)} className={`relative overflow-hidden bg-[#f3f8f5] ${post.images.length === 1 ? "max-h-[28rem]" : "aspect-square"} ${post.images.length === 3 && index === 0 ? "row-span-2 aspect-auto" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase Storage */}
              <img src={url} alt="Foto do post" className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]" />
            </button>
          ))}
        </div>
      )}

      {post.workout && (
        <div className="mt-3 rounded-2xl bg-gradient-to-br from-[#07352b] to-[#087a50] p-4 text-white">
          <p className="flex items-center gap-2 text-sm font-bold"><Dumbbell size={16} className="text-[#b8e986]" />{post.workout.title}</p>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Metric icon={Clock3} value={formatDuration(post.workout.durationSeconds)} label="Tempo" />
            <Metric icon={Flame} value={formatVolume(post.workout.volumeKg)} label="Volume" />
            <Metric icon={Dumbbell} value={String(post.workout.sets)} label="Séries" />
            <Metric icon={Medal} value={String(post.workout.prs)} label="Recordes" />
          </div>
          {post.workout.exercises.length > 0 && (
            <p className="mt-3 line-clamp-2 text-xs text-emerald-100">{post.workout.exercises.slice(0, 4).map(exercise => `${exercise.name}${exercise.bestLoad ? ` ${exercise.bestLoad} kg` : ""}`).join(" · ")}</p>
          )}
        </div>
      )}

      {achievement && (
        <div className="mt-3 flex items-center gap-4 rounded-2xl bg-[#fffaf0] p-4">
          <AchievementBadge achievement={achievement} earned />
          <div>
            <p className="text-xs font-bold tracking-[.12em] text-[#9a6800]">NOVA CONQUISTA</p>
            <p className="font-bold">{achievement.title}</p>
            <p className="text-sm text-[#71837b]">{achievement.description}</p>
          </div>
        </div>
      )}

      <footer className="mt-3 flex items-center gap-1 border-t border-[#f0f4f2] pt-2">
        <motion.button whileTap={reduceMotion ? undefined : { scale: 0.85 }} onClick={toggleLike} aria-pressed={liked} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${liked ? "text-[#e0245e]" : "text-[#71837b] hover:bg-[#fdf0f4] hover:text-[#e0245e]"}`}>
          <motion.span key={String(liked)} initial={reduceMotion || !liked ? false : { scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
            <Heart size={18} fill={liked ? "currentColor" : "none"} />
          </motion.span>
          {likes > 0 && likes}
        </motion.button>
        <button onClick={() => setShowComments(value => !value)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-[#71837b] transition hover:bg-[#eef6f1] hover:text-[#087a50]">
          <MessageCircle size={18} />{commentCount > 0 && commentCount}
        </button>
        <button onClick={share} aria-label="Compartilhar" className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-[#71837b] transition hover:bg-[#eef6f1] hover:text-[#087a50]">
          <Share2 size={17} />
        </button>
      </footer>

      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Comments postId={post.id} postAuthorId={post.author.id} viewerId={viewerId} onCount={setCommentCount} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)} className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/85 p-4" aria-label="Fechar foto">
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={lightbox} alt="Foto ampliada" className="max-h-full max-w-full rounded-2xl object-contain" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof Clock3; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-1 py-2">
      <Icon size={14} className="mx-auto text-[#b8e986]" />
      <p className="mt-1 text-sm font-bold">{value}</p>
      <p className="text-[10px] text-emerald-100">{label}</p>
    </div>
  );
}

function Comments({ postId, postAuthorId, viewerId, onCount }: { postId: string; postAuthorId: string; viewerId: string; onCount: (count: number) => void }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    getComments(postId).then(result => { if (active) setComments(result.comments); });
    return () => { active = false; };
  }, [postId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    const { comment } = await addComment(postId, viewerId, body);
    setSending(false);
    if (!comment) return;
    const next = [...(comments ?? []), comment];
    setComments(next);
    onCount(next.length);
    setBody("");
  }

  async function remove(id: string) {
    const { error } = await deleteComment(id);
    if (error) return;
    const next = (comments ?? []).filter(comment => comment.id !== id);
    setComments(next);
    onCount(next.length);
  }

  return (
    <div className="mt-2 space-y-3 border-t border-[#f0f4f2] pt-3">
      {comments === null ? <p className="text-sm text-[#71837b]">Carregando...</p> : comments.map(comment => (
        <div key={comment.id} className="group flex gap-2.5">
          <FramedAvatar author={comment.author} size="sm" />
          <div className="min-w-0 flex-1 rounded-2xl bg-[#f5f9f7] px-3 py-2">
            <p className="text-xs font-bold">{comment.author.name} <span className="font-normal text-[#91a39b]">· {timeAgo(comment.createdAt)}</span></p>
            <p className="whitespace-pre-wrap break-words text-sm text-[#1d3b33]">{comment.body}</p>
          </div>
          {(comment.author.id === viewerId || postAuthorId === viewerId) && (
            <button onClick={() => remove(comment.id)} aria-label="Excluir comentário" className="self-center rounded-lg p-1.5 text-[#b3c2bb] opacity-0 transition hover:text-[#b94242] group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} /></button>
          )}
        </div>
      ))}
      <form onSubmit={submit} className="flex gap-2">
        <input value={body} onChange={event => setBody(event.target.value)} maxLength={500} placeholder="Escreva um comentário" className="flex-1 rounded-full bg-[#f3f8f5] px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-[#dff3e7]" />
        <button type="submit" disabled={!body.trim() || sending} aria-label="Enviar comentário" className="grid h-9 w-9 place-items-center rounded-full bg-[#087a50] text-white disabled:opacity-40"><Send size={15} /></button>
      </form>
    </div>
  );
}
