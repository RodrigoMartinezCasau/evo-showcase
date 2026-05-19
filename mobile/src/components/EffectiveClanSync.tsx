/**
 * EffectiveClanSync
 *
 * Purpose: keep the mockCurrentUser object in sync with the active user's
 * effective clan (so headers / sidebars / animations re-read it without
 * re-renders), AND act as a *safety net* that retries publishing the
 * authenticated real user's classification snapshot to Supabase when the
 * inline push inside `recordInput` failed (offline, RLS, transient error).
 *
 * NOTE: the *primary* sync now happens inline in `recordInput`. This
 * component used to debounce all writes — that was the source of the
 * "in my phone I'm existencialista, in Supabase I'm still null" bug.
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { useEffectiveClanId } from '@evoconn/hooks/useEffectiveClanId';
import { setActiveSimUser, mockCurrentUser } from '@evoconn/data/mockUser';
import { SIM_USERS_BY_ID } from '@evoconn/data/simulation/simulatedNetwork';
import { isRealUserId } from '@evoconn/services/supabaseSocial';

const RETRY_INTERVAL_MS = 30_000;

export function EffectiveClanSync() {
  const { profile } = useAuth();
  const classification = useClassification();
  const effectiveClanId = useEffectiveClanId();

  // ── 1) Mirror to mockCurrentUser ───────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id || SIM_USERS_BY_ID[profile.id]) return;
    setActiveSimUser({
      id: profile.id,
      username: mockCurrentUser.username,
      clanId: effectiveClanId,
      rank: profile.rank ?? mockCurrentUser.rank,
      followersCount: mockCurrentUser.followersCount,
      followingCount: mockCurrentUser.followingCount,
      avatarUri: profile.avatar_url ?? mockCurrentUser.avatarUri,
    });
  }, [profile?.id, profile?.rank, profile?.avatar_url, effectiveClanId]);

  // ── 2) Retry safety net for failed Supabase publishes ─────────────────────
  //
  // recordInput publishes inline already; this interval only fires when a
  // prior publish failed (network down, etc.). publishNow is a no-op when
  // nothing is dirty, so the cost is negligible.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const uid = profile?.id;
    if (!uid || !isRealUserId(uid)) return;
    if (classification.loading) return;

    // Kick once on mount in case there's already a stale dirty flag.
    if (classification.isDirty(uid)) void classification.publishNow(uid);

    intervalRef.current = setInterval(() => {
      if (classification.isDirty(uid)) void classification.publishNow(uid);
    }, RETRY_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [profile?.id, classification]);

  return null;
}
