/**
 * useFollowState — follow graph from SimulationContext + solicitudes a cuentas privadas.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useAuth } from '../../mobile/lib/AuthContext';
import { supabase } from '../../mobile/lib/supabase';
import {
  isRealUserId,
  fetchProfileIsPrivate,
  fetchOutgoingFollowRequestTargets,
  insertFollowRequest,
  deleteFollowRequest,
} from '@evoconn/services/supabaseSocial';

type FollowContextValue = {
  followingSet: Set<string>;
  isFollowing: (userId: string) => boolean;
  isFollowPending: (userId: string) => boolean;
  toggleFollow: (userId: string) => void;
};

const FollowContext = createContext<FollowContextValue | null>(null);

function displayUsernameForNotifications(profileUsername: string | undefined): string {
  if (profileUsername && profileUsername.trim()) {
    return '@' + profileUsername.trim().toUpperCase();
  }
  return mockCurrentUser.username;
}

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const sim = useSimulation();
  const { addNotification } = useNotifications();
  const taste = useRecommendationTaste();
  const { profile: authProfile } = useAuth();
  const { activeUserId, followGraph, toggleFollow: simToggle } = sim;

  const [outgoingRequestUserIds, setOutgoingRequestUserIds] = useState<Set<string>>(() => new Set());

  const followingSet = useMemo(
    () => followGraph[activeUserId] ?? new Set<string>(),
    [followGraph, activeUserId],
  );

  useEffect(() => {
    if (!isRealUserId(activeUserId)) {
      setOutgoingRequestUserIds(new Set());
      return;
    }
    let cancelled = false;
    fetchOutgoingFollowRequestTargets(activeUserId).then((ids) => {
      if (!cancelled) setOutgoingRequestUserIds(new Set(ids));
    });
    return () => { cancelled = true; };
  }, [activeUserId]);

  useEffect(() => {
    if (!isRealUserId(activeUserId)) return;
    const ch = supabase
      .channel(`follow_requests:${activeUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follow_requests',
          filter: `requester_id=eq.${activeUserId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const tid = payload.new['target_id'];
          if (typeof tid !== 'string') return;
          setOutgoingRequestUserIds((prev) => new Set(prev).add(tid));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'follow_requests',
          filter: `requester_id=eq.${activeUserId}`,
        },
        (payload: { old: Record<string, unknown> }) => {
          const tid = payload.old['target_id'];
          if (typeof tid !== 'string') return;
          setOutgoingRequestUserIds((prev) => {
            const n = new Set(prev);
            n.delete(tid);
            return n;
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeUserId]);

  const toggleFollow = useCallback(
    (uid: string) => {
      const wasFollowing = followingSet.has(uid);
      const pending = outgoingRequestUserIds.has(uid);
      const notifName = displayUsernameForNotifications(authProfile?.username);

      // Sim users (no UUID): comportamiento clásico
      if (!isRealUserId(activeUserId) || !isRealUserId(uid)) {
        simToggle(activeUserId, uid);
        if (!wasFollowing) {
          taste.recordFollow(uid);
          const follower = sim.users[activeUserId];
          addNotification({
            recipientUserId: uid,
            type: 'follow',
            fromUserId: activeUserId,
            fromUsername: follower?.username ?? mockCurrentUser.username,
          });
        } else {
          taste.recordUnfollow(uid);
        }
        return;
      }

      void (async () => {
        if (wasFollowing) {
          simToggle(activeUserId, uid);
          taste.recordUnfollow(uid);
          await deleteFollowRequest(activeUserId, uid);
          setOutgoingRequestUserIds((prev) => {
            const n = new Set(prev);
            n.delete(uid);
            return n;
          });
          return;
        }

        if (pending) {
          await deleteFollowRequest(activeUserId, uid);
          setOutgoingRequestUserIds((prev) => {
            const n = new Set(prev);
            n.delete(uid);
            return n;
          });
          return;
        }

        const isPrivate = await fetchProfileIsPrivate(uid);
        if (isPrivate) {
          const ok = await insertFollowRequest(activeUserId, uid);
          if (ok) {
            setOutgoingRequestUserIds((prev) => new Set(prev).add(uid));
          }
          return;
        }

        simToggle(activeUserId, uid);
        taste.recordFollow(uid);
        addNotification({
          recipientUserId: uid,
          type: 'follow',
          fromUserId: activeUserId,
          fromUsername: notifName,
        });
      })();
    },
    [
      followingSet,
      outgoingRequestUserIds,
      activeUserId,
      sim.users,
      simToggle,
      addNotification,
      taste,
      authProfile?.username,
    ],
  );

  const isFollowPending = useCallback(
    (uid: string) => outgoingRequestUserIds.has(uid),
    [outgoingRequestUserIds],
  );

  const value = useMemo<FollowContextValue>(
    () => ({
      followingSet,
      isFollowing: (uid: string) => followingSet.has(uid),
      isFollowPending,
      toggleFollow,
    }),
    [followingSet, isFollowPending, toggleFollow],
  );

  return (
    <FollowContext.Provider value={value}>{children}</FollowContext.Provider>
  );
}

export function useFollowState() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error('useFollowState must be used within <FollowProvider>');
  return ctx;
}
