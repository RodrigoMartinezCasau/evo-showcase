/**
 * useFollowState — delegates entirely to SimulationContext.
 *
 * `isFollowing(uid)` checks whether the active simulated user follows `uid`.
 * `toggleFollow(uid)` adds/removes the edge in the simulation follow graph.
 */
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';

type FollowContextValue = {
  followingSet: Set<string>;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => void;
};

const FollowContext = createContext<FollowContextValue | null>(null);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const sim = useSimulation();
  const { addNotification } = useNotifications();
  const taste = useRecommendationTaste();
  const { activeUserId, followGraph, toggleFollow: simToggle } = sim;

  const followingSet = useMemo(
    () => followGraph[activeUserId] ?? new Set<string>(),
    [followGraph, activeUserId],
  );

  const toggleFollow = useCallback(
    (uid: string) => {
      const wasFollowing = followingSet.has(uid);
      simToggle(activeUserId, uid);
      if (!wasFollowing) {
        taste.recordFollow(uid);
        const follower = sim.users[activeUserId];
        addNotification({
          recipientUserId: uid,
          type: 'follow',
          fromUserId: activeUserId,
          // For real users, sim.users[activeUserId] is undefined — use mockCurrentUser.
          fromUsername: follower?.username ?? mockCurrentUser.username,
        });
      } else {
        taste.recordUnfollow(uid);
      }
    },
    [followingSet, simToggle, activeUserId, sim.users, addNotification, taste],
  );

  const value = useMemo<FollowContextValue>(
    () => ({
      followingSet,
      isFollowing: (uid: string) => followingSet.has(uid),
      toggleFollow,
    }),
    [followingSet, toggleFollow],
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
