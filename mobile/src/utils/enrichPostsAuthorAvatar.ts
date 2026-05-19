import type { CommunityPost } from '@evoconn/types';

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
