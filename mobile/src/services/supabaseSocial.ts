/**
 * supabaseSocial.ts — Supabase persistence for all social features.
 *
 * Every function is fire-and-forget safe: on network error it logs and
 * returns a safe default so the optimistic UI is never blocked.
 *
 * DB ↔ SimPost/SimComment mappings live here so SimulationContext stays
 * focused on React state management.
 */
import { supabase } from '../../mobile/lib/supabase';
import type { SimPost, SimComment } from '../data/simulation/simulatedNetwork';
import type { Rank } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DbVoteRow  = { user_id: string; post_id: string; vote: 'up' | 'down' };
export type DbSaveRow  = { user_id: string; post_id: string };
export type DbFollowRow = { follower_id: string; following_id: string };

export type DbNotificationInsert = {
  recipient_id: string;
  type: string;
  from_user_id: string;
  from_username: string;
  post_id?: string;
  comment_id?: string;
  text_preview?: string;
};

export type DbNotification = DbNotificationInsert & {
  id: string;
  read: boolean;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if id looks like a real Supabase UUID (not a sim id like 'u1'). */
export function isRealUserId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function fetchAllPosts(): Promise<SimPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) { console.error('[Social] fetchAllPosts:', error.message); return []; }
  return (data ?? []).map(dbRowToSimPost);
}

export async function insertPost(post: SimPost): Promise<void> {
  if (!isRealUserId(post.authorId)) return;
  const { error } = await supabase.from('posts').upsert(simPostToDbRow(post), { onConflict: 'id' });
  if (error) console.error('[Social] insertPost:', error.message);
}

export async function removePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) console.error('[Social] removePost:', error.message);
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function fetchCommentsForPost(postId: string): Promise<SimComment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) { console.error('[Social] fetchComments:', error.message); return []; }
  return (data ?? []).map(dbRowToSimComment);
}

export async function insertComment(comment: SimComment): Promise<void> {
  if (!isRealUserId(comment.authorId)) return;
  const { error } = await supabase.from('comments').upsert(simCommentToDbRow(comment), { onConflict: 'id' });
  if (error) console.error('[Social] insertComment:', error.message);
}

// ─── Votes ────────────────────────────────────────────────────────────────────

/** Fetches all votes for a list of post IDs (to reconstruct upvoterIds/downvoterIds). */
export async function fetchVotesForPosts(postIds: string[]): Promise<DbVoteRow[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from('votes')
    .select('user_id, post_id, vote')
    .in('post_id', postIds);
  if (error) { console.error('[Social] fetchVotes:', error.message); return []; }
  return (data ?? []) as DbVoteRow[];
}

/** Fetches my votes only (for restoring my voteMap). */
export async function fetchMyVotes(userId: string): Promise<Record<string, 'up' | 'down'>> {
  if (!isRealUserId(userId)) return {};
  const { data, error } = await supabase
    .from('votes')
    .select('post_id, vote')
    .eq('user_id', userId);
  if (error) { console.error('[Social] fetchMyVotes:', error.message); return {}; }
  const map: Record<string, 'up' | 'down'> = {};
  for (const row of data ?? []) map[row.post_id] = row.vote;
  return map;
}

export async function upsertVote(userId: string, postId: string, vote: 'up' | 'down'): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase
    .from('votes')
    .upsert({ user_id: userId, post_id: postId, vote }, { onConflict: 'user_id,post_id' });
  if (error) console.error('[Social] upsertVote:', error.message);
}

export async function deleteVote(userId: string, postId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('votes').delete()
    .eq('user_id', userId).eq('post_id', postId);
  if (error) console.error('[Social] deleteVote:', error.message);
}

// ─── Saves ────────────────────────────────────────────────────────────────────

export async function fetchMySaves(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  const { data, error } = await supabase
    .from('saves')
    .select('post_id')
    .eq('user_id', userId);
  if (error) { console.error('[Social] fetchMySaves:', error.message); return []; }
  return (data ?? []).map(r => r.post_id);
}

export async function insertSave(userId: string, postId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('saves').upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id' });
  if (error) console.error('[Social] insertSave:', error.message);
}

export async function deleteSave(userId: string, postId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('saves').delete()
    .eq('user_id', userId).eq('post_id', postId);
  if (error) console.error('[Social] deleteSave:', error.message);
}

// ─── Follows ──────────────────────────────────────────────────────────────────

/** Returns the list of user IDs that `userId` follows. */
export async function fetchFollowing(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) { console.error('[Social] fetchFollowing:', error.message); return []; }
  return (data ?? []).map(r => r.following_id);
}

/** Returns the list of user IDs that follow `userId`. */
export async function fetchFollowers(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);
  if (error) { console.error('[Social] fetchFollowers:', error.message); return []; }
  return (data ?? []).map(r => r.follower_id);
}

export async function insertFollow(followerId: string, followingId: string): Promise<void> {
  if (!isRealUserId(followerId) || !isRealUserId(followingId)) return;
  const { error } = await supabase.from('follows')
    .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id' });
  if (error) console.error('[Social] insertFollow:', error.message);
}

export async function deleteFollow(followerId: string, followingId: string): Promise<void> {
  if (!isRealUserId(followerId) || !isRealUserId(followingId)) return;
  const { error } = await supabase.from('follows').delete()
    .eq('follower_id', followerId).eq('following_id', followingId);
  if (error) console.error('[Social] deleteFollow:', error.message);
}

// ─── Posts by user ────────────────────────────────────────────────────────────

/** Fetch all posts from a specific author (for their profile page). */
export async function fetchPostsByUser(userId: string): Promise<SimPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('[Social] fetchPostsByUser:', error.message); return []; }
  const posts = (data ?? []).map(dbRowToSimPost);
  if (posts.length === 0) return posts;
  // Hydrate vote counts.
  const voteRows = await fetchVotesForPosts(posts.map(p => p.id));
  for (const row of voteRows) {
    const post = posts.find(p => p.id === row.post_id);
    if (!post) continue;
    if (row.vote === 'up')   post.upvoterIds   = [...post.upvoterIds,   row.user_id];
    if (row.vote === 'down') post.downvoterIds = [...post.downvoterIds, row.user_id];
  }
  return posts;
}

// ─── Follow counts ────────────────────────────────────────────────────────────

/** Returns { followersCount, followingCount } for any user. */
export async function fetchFollowCounts(
  userId: string,
): Promise<{ followersCount: number; followingCount: number }> {
  if (!isRealUserId(userId)) return { followersCount: 0, followingCount: 0 };
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return {
    followersCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
  };
}

// ─── Profile stats ────────────────────────────────────────────────────────────

/** Increment total_reflections or total_quotes in the profiles table. */
export async function incrementProfileStat(
  userId: string,
  field: 'total_reflections' | 'total_quotes',
): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.rpc('increment_profile_stat', {
    user_id: userId,
    stat_field: field,
  });
  if (error) console.error('[Social] incrementProfileStat:', error.message);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function fetchMyNotifications(userId: string): Promise<DbNotification[]> {
  if (!isRealUserId(userId)) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('[Social] fetchNotifications:', error.message); return []; }
  return (data ?? []) as DbNotification[];
}

export async function insertNotification(n: DbNotificationInsert): Promise<void> {
  if (!isRealUserId(n.recipient_id)) return;
  const { error } = await supabase.from('notifications').insert(n);
  if (error) console.error('[Social] insertNotification:', error.message);
}

export async function markNotificationsRead(userId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('notifications')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('read', false);
  if (error) console.error('[Social] markNotificationsRead:', error.message);
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function simPostToDbRow(p: SimPost) {
  return {
    id:              p.id,
    author_id:       p.authorId,
    author_username: p.authorUsername ?? '',
    author_clan_id:  p.authorClanId  ?? null,
    author_rank:     p.authorRank    ?? 'aprendiz',
    type:            p.type,
    title:           p.title         ?? null,
    body:            p.body,
    quote_author:    p.quoteAuthor   ?? null,
    created_at:      p.createdAt,
  };
}

export function dbRowToSimPost(row: Record<string, unknown>): SimPost {
  return {
    id:             row.id             as string,
    authorId:       row.author_id      as string,
    authorUsername: row.author_username as string,
    authorClanId:   row.author_clan_id  as string | null,
    authorRank:     row.author_rank     as Rank,
    type:           row.type            as 'reflection' | 'phrase',
    title:          row.title           as string | undefined,
    body:           row.body            as string,
    quoteAuthor:    row.quote_author    as string | undefined,
    createdAt:      row.created_at      as string,
    upvoterIds:   [],
    downvoterIds: [],
    saverIds:     [],
  };
}

function simCommentToDbRow(c: SimComment) {
  return {
    id:              c.id,
    post_id:         c.postId,
    author_id:       c.authorId,
    author_username: c.authorUsername ?? '',
    author_clan_id:  c.authorClanId  ?? null,
    author_rank:     c.authorRank    ?? 'aprendiz',
    body:            c.body,
    created_at:      c.createdAt,
  };
}

export function dbRowToSimComment(row: Record<string, unknown>): SimComment {
  return {
    id:             row.id              as string,
    postId:         row.post_id         as string,
    authorId:       row.author_id       as string,
    authorUsername: row.author_username as string,
    authorClanId:   row.author_clan_id  as string | null,
    authorRank:     row.author_rank     as Rank,
    body:           row.body            as string,
    upCount:        0,
    createdAt:      row.created_at      as string,
  };
}
