import type { User, Rank } from '../types';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { isRealUserId } from '@evoconn/services/supabaseSocial';

type PublishProfile = {
  id: string;
  username: string;
  clan_id: string | null;
  rank: Rank;
  avatar_url?: string | null;
};

/** Author snapshot for new posts — never use cold-start @RODRIGOMARTINEZ when profile is loaded. */
export function userForPublish(profile: PublishProfile | null | undefined): User {
  if (profile?.id && isRealUserId(profile.id)) {
    const raw = profile.username?.trim();
    return {
      id: profile.id,
      username: raw ? `@${raw.toUpperCase()}` : mockCurrentUser.username,
      clanId: profile.clan_id,
      rank: profile.rank,
      avatarUri: profile.avatar_url ?? undefined,
    };
  }
  return mockCurrentUser;
}
