/**
 * useFollowState — delegates entirely to SimulationContext.
 *
 * `isFollowing(uid)` checks whether the active simulated user follows `uid`.
 * `toggleFollow(uid)` adds/removes the edge in the simulation follow graph.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useSimulation } from '@evoconn/hooks/SimulationContext';

type FollowContextValue = {
  followingSet: Set<string>;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => void;
};

const FollowContext = createContext<FollowContextValue | null>(null);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const sim = useSimulation();
  const { activeUserId, followGraph, toggleFollow: simToggle } = sim;

  const followingSet = useMemo(
    () => followGraph[activeUserId] ?? new Set<string>(),
    [followGraph, activeUserId],
  );

  const value = useMemo<FollowContextValue>(
    () => ({
      followingSet,
      isFollowing: (uid: string) => followingSet.has(uid),
      toggleFollow: (uid: string) => simToggle(activeUserId, uid),
    }),
    [followingSet, simToggle, activeUserId],
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
