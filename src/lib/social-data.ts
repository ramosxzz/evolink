"use client";

import { createClient } from "@/lib/supabase/client";

export type Visibility = "coach" | "followers" | "community";
export type FeedScope = "community" | "following" | { authorId: string };

export type Author = { id: string; name: string; avatarUrl: string | null; frame: string };

export type FeedPost = {
  id: string;
  author: Author;
  kind: "workout" | "text" | "photo" | "cardio" | "achievement";
  visibility: Visibility;
  caption: string | null;
  images: string[];
  workout: { title: string; durationSeconds: number; volumeKg: number; sets: number; prs: number; exercises: { name: string; sets: number; bestLoad: number }[] } | null;
  achievementCode: string | null;
  createdAt: string;
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
};

export type Comment = { id: string; body: string; createdAt: string; author: Author };

export type Achievement = {
  code: string;
  category: "treino" | "cardio" | "consistencia" | "evolucao" | "comunidade";
  title: string;
  description: string;
  icon: string;
  tier: "bronze" | "prata" | "ouro" | "diamante";
  points: number;
  metric: string;
  threshold: number;
};

export type Frame = { code: string; title: string; required_achievement: string | null };

export type PublicProfile = {
  author: Author;
  bio: string | null;
  role: "student" | "professional";
  isPublic: boolean;
  followers: number;
  following: number;
  posts: number;
  viewerFollows: boolean;
  earned: { code: string; earned_at: string }[];
};

const PAGE_SIZE = 15;
const profileColumns = "id, display_name, avatar_path, frame, avatar_updated_at";
type ProfileRow = { id: string; display_name: string; avatar_path: string | null; frame: string | null; avatar_updated_at: string | null };

export function avatarUrl(path: string | null, version?: string | null) {
  if (!path) return null;
  const { data } = createClient().storage.from("avatars").getPublicUrl(path);
  return version ? `${data.publicUrl}?v=${encodeURIComponent(version)}` : data.publicUrl;
}

function toAuthor(row: ProfileRow | null | undefined, fallbackId = ""): Author {
  return {
    id: row?.id ?? fallbackId,
    name: row?.display_name ?? "Atleta Evolink",
    avatarUrl: avatarUrl(row?.avatar_path ?? null, row?.avatar_updated_at),
    frame: row?.frame ?? "none",
  };
}

async function signImages(paths: string[]) {
  if (!paths.length) return {} as Record<string, string>;
  const { data } = await createClient().storage.from("social-media").createSignedUrls(paths, 3600);
  return Object.fromEntries((data ?? []).filter(item => item.path && item.signedUrl).map(item => [item.path as string, item.signedUrl])) as Record<string, string>;
}

// Feed -------------------------------------------------------------------------

export async function getFeed(viewerId: string, scope: FeedScope, before?: string) {
  const supabase = createClient();
  let query = supabase
    .from("social_posts")
    .select(`id, author_id, kind, visibility, caption, image_paths, workout_title, duration_seconds, total_volume_kg, total_sets, pr_count, exercise_summary, achievement_code, created_at,
      social_profiles!social_posts_author_id_fkey(${profileColumns}),
      social_post_likes(user_id),
      social_comments(count)`)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (before) query = query.lt("created_at", before);
  if (scope === "community") query = query.eq("visibility", "community");
  if (scope === "following") {
    const { data: follows } = await supabase.from("social_follows").select("followee_id").eq("follower_id", viewerId);
    const ids = [viewerId, ...(follows ?? []).map(row => row.followee_id)];
    query = query.in("author_id", ids);
  }
  if (typeof scope === "object") query = query.eq("author_id", scope.authorId);

  const { data, error } = await query;
  if (error) return { posts: [] as FeedPost[], hasMore: false, error };

  const urls = await signImages((data ?? []).flatMap(row => row.image_paths ?? []));
  const posts = (data ?? []).map(row => {
    const likes = (row.social_post_likes ?? []) as { user_id: string }[];
    const comments = (row.social_comments ?? []) as unknown as { count: number }[];
    return {
      id: row.id,
      author: toAuthor(row.social_profiles as unknown as ProfileRow, row.author_id),
      kind: row.kind,
      visibility: row.visibility,
      caption: row.caption,
      images: (row.image_paths ?? []).map((path: string) => urls[path]).filter(Boolean),
      workout: row.kind === "workout" && row.workout_title
        ? { title: row.workout_title, durationSeconds: row.duration_seconds, volumeKg: Number(row.total_volume_kg), sets: row.total_sets, prs: row.pr_count, exercises: (row.exercise_summary ?? []) as { name: string; sets: number; bestLoad: number }[] }
        : null,
      achievementCode: row.achievement_code,
      createdAt: row.created_at,
      likeCount: likes.length,
      likedByViewer: likes.some(like => like.user_id === viewerId),
      commentCount: comments[0]?.count ?? 0,
    } as FeedPost;
  });
  return { posts, hasMore: posts.length === PAGE_SIZE, error: null };
}

export async function createPost(viewerId: string, input: { caption: string; files: File[]; visibility: Visibility; achievementCode?: string }) {
  const supabase = createClient();
  const paths: string[] = [];
  for (const file of input.files.slice(0, 4)) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${viewerId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type });
    if (error) {
      if (paths.length) await supabase.storage.from("social-media").remove(paths);
      return { error };
    }
    paths.push(path);
  }
  const kind = input.achievementCode ? "achievement" : paths.length ? "photo" : "text";
  const { error } = await supabase.from("social_posts").insert({
    author_id: viewerId,
    kind,
    visibility: input.visibility,
    caption: input.caption.trim() || null,
    image_paths: paths,
    achievement_code: input.achievementCode ?? null,
  });
  if (error && paths.length) await supabase.storage.from("social-media").remove(paths);
  return { error };
}

export async function deletePost(postId: string) {
  return createClient().from("social_posts").delete().eq("id", postId);
}

export async function setLike(postId: string, userId: string, like: boolean) {
  const supabase = createClient();
  return like
    ? supabase.from("social_post_likes").insert({ post_id: postId, user_id: userId })
    : supabase.from("social_post_likes").delete().eq("post_id", postId).eq("user_id", userId);
}

export async function getComments(postId: string) {
  const { data, error } = await createClient()
    .from("social_comments")
    .select(`id, body, created_at, social_profiles!social_comments_author_id_fkey(${profileColumns})`)
    .eq("post_id", postId)
    .order("created_at");
  return {
    comments: (data ?? []).map(row => ({ id: row.id, body: row.body, createdAt: row.created_at, author: toAuthor(row.social_profiles as unknown as ProfileRow) })) as Comment[],
    error,
  };
}

export async function addComment(postId: string, authorId: string, body: string) {
  const { data, error } = await createClient()
    .from("social_comments")
    .insert({ post_id: postId, author_id: authorId, body: body.trim() })
    .select(`id, body, created_at, social_profiles!social_comments_author_id_fkey(${profileColumns})`)
    .single();
  return { comment: data ? ({ id: data.id, body: data.body, createdAt: data.created_at, author: toAuthor(data.social_profiles as unknown as ProfileRow) } as Comment) : null, error };
}

export async function deleteComment(commentId: string) {
  return createClient().from("social_comments").delete().eq("id", commentId);
}

// Profiles ------------------------------------------------------------------------

export async function getPublicProfile(profileId: string, viewerId: string) {
  const supabase = createClient();
  const [profile, social, followers, following, posts, follows, earned] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", profileId).maybeSingle(),
    supabase.from("social_profiles").select(`${profileColumns}, bio, is_public`).eq("id", profileId).maybeSingle(),
    supabase.from("social_follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", profileId),
    supabase.from("social_follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", profileId),
    supabase.from("social_posts").select("id", { count: "exact", head: true }).eq("author_id", profileId),
    supabase.from("social_follows").select("followee_id").eq("follower_id", viewerId).eq("followee_id", profileId).maybeSingle(),
    supabase.from("user_achievements").select("code, earned_at").eq("user_id", profileId).order("earned_at", { ascending: false }),
  ]);
  if (!social.data) return { profile: null, error: social.error ?? new Error("Perfil não encontrado") };
  return {
    profile: {
      author: toAuthor(social.data as ProfileRow),
      bio: social.data.bio,
      role: (profile.data?.role ?? "student") as PublicProfile["role"],
      isPublic: social.data.is_public,
      followers: followers.count ?? 0,
      following: following.count ?? 0,
      posts: posts.count ?? 0,
      viewerFollows: Boolean(follows.data),
      earned: earned.data ?? [],
    } as PublicProfile,
    error: null,
  };
}

export async function setFollow(viewerId: string, profileId: string, follow: boolean) {
  const supabase = createClient();
  return follow
    ? supabase.from("social_follows").insert({ follower_id: viewerId, followee_id: profileId })
    : supabase.from("social_follows").delete().eq("follower_id", viewerId).eq("followee_id", profileId);
}

export async function updateSocialProfile(profileId: string, values: { displayName?: string; bio?: string; frame?: string; isPublic?: boolean }) {
  return createClient()
    .from("social_profiles")
    .update({
      ...(values.displayName !== undefined ? { display_name: values.displayName.trim() } : {}),
      ...(values.bio !== undefined ? { bio: values.bio.trim() || null } : {}),
      ...(values.frame !== undefined ? { frame: values.frame } : {}),
      ...(values.isPublic !== undefined ? { is_public: values.isPublic } : {}),
    })
    .eq("id", profileId);
}

export async function uploadAvatar(profileId: string, file: File) {
  const supabase = createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${profileId}/avatar.${extension}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
  if (error) return { error, url: null };
  const updatedAt = new Date().toISOString();
  const { error: updateError } = await supabase.from("social_profiles").update({ avatar_path: path, avatar_updated_at: updatedAt }).eq("id", profileId);
  return { error: updateError, url: avatarUrl(path, updatedAt) };
}

export async function searchProfiles(term: string) {
  const { data } = await createClient()
    .from("social_profiles")
    .select(profileColumns)
    .eq("is_public", true)
    .ilike("display_name", `%${term.replace(/[%_]/g, "")}%`)
    .limit(12);
  return (data ?? []).map(row => toAuthor(row as ProfileRow));
}

// Achievements -----------------------------------------------------------------

export async function getAchievementCatalog() {
  const supabase = createClient();
  const [achievements, frames] = await Promise.all([
    supabase.from("achievements").select("code, category, title, description, icon, tier, points, metric, threshold").order("position"),
    supabase.from("profile_frames").select("code, title, required_achievement").order("position"),
  ]);
  return {
    achievements: (achievements.data ?? []).map(row => ({ ...row, threshold: Number(row.threshold) })) as Achievement[],
    frames: (frames.data ?? []) as Frame[],
  };
}

export async function getMyAchievements(userId: string) {
  const supabase = createClient();
  // Re-check first, so activity logged before a trigger existed is counted.
  await supabase.rpc("evaluate_achievements", { target: userId });
  const [earned, metrics] = await Promise.all([
    supabase.from("user_achievements").select("code, earned_at").eq("user_id", userId),
    supabase.rpc("achievement_metrics", { target: userId }),
  ]);
  return { earned: earned.data ?? [], metrics: (metrics.data ?? {}) as Record<string, number>, error: earned.error ?? metrics.error };
}

/** Level from total points: each level needs 50 more points than the last. */
export function levelFor(points: number) {
  let level = 1;
  let floor = 0;
  let step = 50;
  while (points >= floor + step) {
    floor += step;
    level += 1;
    step += 50;
  }
  return { level, progress: (points - floor) / step, toNext: floor + step - points };
}
