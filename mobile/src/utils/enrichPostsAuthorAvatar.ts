import type { CommunityPost } from '@evoconn/types';

/**
 * Para ti guarda un snapshot de posts; cuando `allPosts` recibe avatares de
 * Supabase, fusiona solo `author.avatarUri` sin cambiar orden ni ranking.
 */
export function mergePanelPostsAuthorAvatars(
  panelPosts: CommunityPost[],
  livePosts: CommunityPost[],
): CommunityPost[] {
  if (panelPosts.length === 0 || livePosts.length === 0) return panelPosts;
  const liveById = new Map(livePosts.map((p) => [p.id, p]));
  let changed = false;
  const next = panelPosts.map((p) => {
    const live = liveById.get(p.id);
    if (!live) return p;
    const liveAv = live.author.avatarUri?.trim() || undefined;
    const panelAv = p.author.avatarUri?.trim() || undefined;
    if (liveAv === panelAv) return p;
    changed = true;
    return { ...p, author: { ...p.author, avatarUri: live.author.avatarUri } };
  });
  return changed ? next : panelPosts;
}

/** Attach the profile owner's avatar to post authors when the feed row omitted it. */
export function enrichPostsAuthorAvatar(
  posts: CommunityPost[],
  authorUserId: string,
  avatarUri?: string | null,
): CommunityPost[] {
  const av = avatarUri?.trim();
  if (!av) return posts;
  return posts.map((p) =>
    p.author.id === authorUserId
      ? {
          ...p,
          author: {
            ...p.author,
            avatarUri: p.author.avatarUri?.trim() || av,
          },
        }
      : p,
  );
}
