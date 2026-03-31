import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { MOCK_INITIAL_FOLLOWING } from '@evoconn/data/mockUser';

type FollowContextValue = {
  /** Set of user IDs the current user follows. */
  followingSet: Set<string>;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => void;
};

const FollowContext = createContext<FollowContextValue | null>(null);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const [followingSet, setFollowingSet] = useState<Set<string>>(
    () => new Set(MOCK_INITIAL_FOLLOWING),
  );

  const isFollowing = useCallback(
    (userId: string) => followingSet.has(userId),
    [followingSet],
  );

  const toggleFollow = useCallback((userId: string) => {
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ followingSet, isFollowing, toggleFollow }),
    [followingSet, isFollowing, toggleFollow],
  );

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollowState() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error('useFollowState must be used within <FollowProvider>');
  return ctx;
}
