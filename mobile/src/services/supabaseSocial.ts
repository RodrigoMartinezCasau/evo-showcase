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
  // Filter out hidden posts client-side; is_hidden column may not exist yet.
  return (data ?? [])
    .filter((row: Record<string, unknown>) => row['is_hidden'] !== true)
    .map(dbRowToSimPost);
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
  if (error) {
    console.error('[Social] insertComment:', error.message);
    throw new Error(error.message);
  }
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

// ─── Follow requests (private accounts) ───────────────────────────────────────

/** Supabase PostgREST antes de migrar: tabla aún no expuesta → evita LogBox con console.error. */
function isFollowRequestsTableMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('follow_requests') &&
    (m.includes('schema cache') || m.includes('does not exist') || m.includes('not find'))
  );
}

export async function fetchProfileIsPrivate(userId: string): Promise<boolean> {
  if (!isRealUserId(userId)) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('is_private')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[Social] fetchProfileIsPrivate:', error.message);
    return false;
  }
  return !!(data as { is_private?: boolean } | null)?.is_private;
}

export async function fetchOutgoingFollowRequestTargets(requesterId: string): Promise<string[]> {
  if (!isRealUserId(requesterId)) return [];
  const { data, error } = await supabase
    .from('follow_requests')
    .select('target_id')
    .eq('requester_id', requesterId);
  if (error) {
    if (isFollowRequestsTableMissing(error.message)) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[Social] Tabla follow_requests no creada en Supabase. Ejecuta supabase_private_accounts.sql',
        );
      }
    } else {
      console.error('[Social] fetchOutgoingFollowRequestTargets:', error.message);
    }
    return [];
  }
  return (data ?? []).map((r: { target_id: string }) => r.target_id);
}

/** Creates a pending request; DB trigger inserts follow_request notification for target. */
export async function insertFollowRequest(requesterId: string, targetId: string): Promise<boolean> {
  if (!isRealUserId(requesterId) || !isRealUserId(targetId)) return false;
  const { error } = await supabase.from('follow_requests').insert({
    requester_id: requesterId,
    target_id: targetId,
  });
  if (error) {
    if (isFollowRequestsTableMissing(error.message)) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[Social] insertFollowRequest: falta migración follow_requests');
      }
    } else {
      console.error('[Social] insertFollowRequest:', error.message);
    }
    return false;
  }
  return true;
}

export async function deleteFollowRequest(requesterId: string, targetId: string): Promise<void> {
  if (!isRealUserId(requesterId) || !isRealUserId(targetId)) return;
  const { error } = await supabase
    .from('follow_requests')
    .delete()
    .eq('requester_id', requesterId)
    .eq('target_id', targetId);
  if (error && !isFollowRequestsTableMissing(error.message)) {
    console.error('[Social] deleteFollowRequest:', error.message);
  }
}

export async function acceptFollowRequestRpc(requesterId: string): Promise<boolean> {
  if (!isRealUserId(requesterId)) return false;
  const { error } = await supabase.rpc('accept_follow_request', { p_requester: requesterId });
  if (error) {
    console.error('[Social] acceptFollowRequestRpc:', error.message);
    return false;
  }
  return true;
}

export async function rejectFollowRequestRpc(requesterId: string): Promise<boolean> {
  if (!isRealUserId(requesterId)) return false;
  const { error } = await supabase.rpc('reject_follow_request', { p_requester: requesterId });
  if (error) {
    console.error('[Social] rejectFollowRequestRpc:', error.message);
    return false;
  }
  return true;
}

export async function setProfilePrivate(userId: string, isPrivate: boolean): Promise<boolean> {
  if (!isRealUserId(userId)) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ is_private: isPrivate })
    .eq('id', userId);
  if (error) {
    console.error('[Social] setProfilePrivate:', error.message);
    return false;
  }
  return true;
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

// ─── Profiles batch fetch ─────────────────────────────────────────────────────

export type BasicProfile = {
  id: string;
  username: string;
  clanId: string | null;
  rank: string;
};

/** Fetch basic profile info for a list of user IDs (for followers/following display). */
export async function fetchProfilesBatch(userIds: string[]): Promise<BasicProfile[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, clan_id, rank')
    .in('id', userIds);
  if (error) { console.error('[Social] fetchProfilesBatch:', error.message); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    username: r.username ? `@${r.username.toUpperCase()}` : `@${r.id.slice(0, 8)}`,
    clanId: r.clan_id ?? null,
    rank: r.rank ?? 'aprendiz',
  }));
}

/** Search users by username prefix/substring in Supabase profiles. */
export async function searchSupabaseUsers(query: string): Promise<BasicProfile[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, clan_id, rank')
    .ilike('username', `%${query.trim()}%`)
    .limit(30);
  if (error) { console.error('[Social] searchSupabaseUsers:', error.message); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    username: r.username ?? r.id.slice(0, 8),
    clanId: r.clan_id ?? null,
    rank: r.rank ?? 'aprendiz',
  }));
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

// ─── Hide post ────────────────────────────────────────────────────────────────

/** Toggle is_hidden on a post. Returns the new hidden state. */
export async function setPostHidden(postId: string, isHidden: boolean): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ is_hidden: isHidden })
    .eq('id', postId);
  if (error) console.error('[Social] setPostHidden:', error.message);
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
  if (error) console.error('[Social] blockUser:', error.message);
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) console.error('[Social] unblockUser:', error.message);
}

export interface BlockedProfile {
  blockedId: string;
  username: string;
  clanId: string | null;
}

export async function fetchBlockedUsers(blockerId: string): Promise<BlockedProfile[]> {
  // Step 1: get blocked user IDs
  const { data: blockRows, error: blockErr } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId);
  if (blockErr) { console.error('[Social] fetchBlockedUsers:', blockErr.message); return []; }
  if (!blockRows || blockRows.length === 0) return [];

  const ids = blockRows.map((r: Record<string, unknown>) => r.blocked_id as string);

  // Step 2: fetch profiles for those IDs
  const { data: profileRows, error: profileErr } = await supabase
    .from('profiles')
    .select('id, username, clan_id')
    .in('id', ids);
  if (profileErr) { console.error('[Social] fetchBlockedUsers profiles:', profileErr.message); }

  const profileMap: Record<string, { username: string | null; clan_id: string | null }> = {};
  for (const p of (profileRows ?? []) as Record<string, unknown>[]) {
    profileMap[p.id as string] = { username: p.username as string | null, clan_id: p.clan_id as string | null };
  }

  return ids.map((blockedId) => {
    const p = profileMap[blockedId];
    return {
      blockedId,
      username: p?.username ? '@' + p.username.toUpperCase() : '@' + blockedId.slice(0, 8),
      clanId: p?.clan_id ?? null,
    };
  });
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ReportInsert {
  reporterId: string;
  targetType: 'post' | 'user' | 'comment' | 'bug';
  targetId?: string;
  reason: string;
}

export async function insertReport(r: ReportInsert): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: r.reporterId,
    target_type: r.targetType,
    target_id: r.targetId ?? null,
    reason: r.reason,
  });
  if (error) console.error('[Social] insertReport:', error.message);
}

export interface Report {
  id: string;
  targetType: string;
  targetId: string | null;
  reason: string;
  createdAt: string;
}

export async function fetchMyReports(reporterId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, created_at')
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[Social] fetchMyReports:', error.message); return []; }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    targetType: r.target_type as string,
    targetId: r.target_id as string | null,
    reason: r.reason as string,
    createdAt: r.created_at as string,
  }));
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
