/**
 * Caché en memoria de perfiles de OTROS usuarios (stale-while-revalidate).
 *
 * Objetivo: que abrir un perfil desde el feed se sienta instantáneo. Al pulsar
 * (o incluso al ver un post en "Para ti") sembramos aquí lo que ya conocemos del
 * autor — avatar, @usuario, clan, rango — para que `ProfileScreen` pinte la
 * identidad en el primer frame mientras refresca los datos completos por detrás.
 *
 * No persiste a disco a propósito: se limpia al cerrar la app.
 */
import type { OtherUserProfile } from '@evoconn/data/mockOtherUsers';
import type { CommunityPost, User } from '@evoconn/types';

export type OtherProfileCacheEntry = {
  profile: OtherUserProfile;
  posts: CommunityPost[];
  isPrivate: boolean;
  followSnap: { followers: number; following: number; iFollowed: boolean } | null;
  /** true cuando la entrada solo tiene identidad (avatar/@/clan), sin datos completos. */
  partial?: boolean;
};

export const otherProfileCache = new Map<string, OtherProfileCacheEntry>();

/** @usuario en el formato que espera el header del perfil ("@LALI"). */
function normalizeUsername(raw: string | undefined | null): string {
  const trimmed = (raw ?? '').trim();
  const noAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return noAt ? `@${noAt.toUpperCase()}` : '?';
}

/**
 * Siembra una entrada mínima (solo identidad) si todavía no hay nada cacheado
 * para ese usuario. Nunca degrada una entrada completa ya existente.
 */
export function seedOtherProfileFromAuthor(author: Pick<User, 'id' | 'username' | 'clanId' | 'rank' | 'avatarUri'>): void {
  const id = author?.id?.trim();
  if (!id) return;

  const existing = otherProfileCache.get(id);
  // Solo sembramos si no hay nada, o si lo que hay también es parcial (refrescamos avatar/clan).
  if (existing && !existing.partial) return;

  const profile: OtherUserProfile = {
    id,
    username: normalizeUsername(author.username),
    clanId: author.clanId ?? null,
    rank: author.rank ?? 'aprendiz',
    followersCount: existing?.profile.followersCount ?? 0,
    followingCount: existing?.profile.followingCount ?? 0,
    insigniaPhrase: existing?.profile.insigniaPhrase ?? '',
    philosophyPercentages: existing?.profile.philosophyPercentages ?? [],
    totalReflections: existing?.profile.totalReflections ?? 0,
    totalQuotes: existing?.profile.totalQuotes ?? 0,
    recentPosts: existing?.profile.recentPosts ?? [],
    avatarUri: author.avatarUri ?? existing?.profile.avatarUri ?? null,
  };

  otherProfileCache.set(id, {
    profile,
    posts: existing?.posts ?? [],
    isPrivate: existing?.isPrivate ?? false,
    followSnap: existing?.followSnap ?? null,
    partial: true,
  });
}
