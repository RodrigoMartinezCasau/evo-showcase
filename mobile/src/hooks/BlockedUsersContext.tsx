/**
 * BlockedUsersContext — single source of truth for blocked user IDs.
 * Loaded from Supabase on session start; updated on block/unblock in-app.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../../mobile/lib/AuthContext';
import {
  blockUser,
  unblockUser,
  fetchBlockedUserIds,
  isRealUserId,
} from '@evoconn/services/supabaseSocial';

type BlockedUsersContextValue = {
  blockedIds: ReadonlySet<string>;
  isBlocked: (userId: string) => boolean;
  refreshBlockedUsers: () => Promise<void>;
  block: (blockedId: string) => Promise<boolean>;
  unblock: (blockedId: string) => Promise<boolean>;
};

const BlockedUsersCtx = createContext<BlockedUsersContextValue | null>(null);

export function BlockedUsersProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const refreshBlockedUsers = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid || !isRealUserId(uid)) {
      setBlockedIds(new Set());
      return;
    }
    const ids = await fetchBlockedUserIds(uid);
    setBlockedIds(new Set(ids));
  }, [session?.user?.id]);

  useEffect(() => {
    void refreshBlockedUsers();
  }, [refreshBlockedUsers]);

  const isBlocked = useCallback(
    (userId: string) => blockedIds.has(userId),
    [blockedIds],
  );

  const block = useCallback(
    async (blockedId: string): Promise<boolean> => {
      const uid = session?.user?.id;
      if (!uid || !isRealUserId(uid) || !isRealUserId(blockedId)) {
        setBlockedIds((prev) => new Set(prev).add(blockedId));
        return true;
      }
      await blockUser(uid, blockedId);
      setBlockedIds((prev) => new Set(prev).add(blockedId));
      return true;
    },
    [session?.user?.id],
  );

  const unblock = useCallback(
    async (blockedId: string): Promise<boolean> => {
      const uid = session?.user?.id;
      if (!uid || !isRealUserId(uid) || !isRealUserId(blockedId)) {
        setBlockedIds((prev) => {
          const next = new Set(prev);
          next.delete(blockedId);
          return next;
        });
        return true;
      }
      await unblockUser(uid, blockedId);
      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(blockedId);
        return next;
      });
      return true;
    },
    [session?.user?.id],
  );

  const value = useMemo<BlockedUsersContextValue>(
    () => ({
      blockedIds,
      isBlocked,
      refreshBlockedUsers,
      block,
      unblock,
    }),
    [blockedIds, isBlocked, refreshBlockedUsers, block, unblock],
  );

  return (
    <BlockedUsersCtx.Provider value={value}>{children}</BlockedUsersCtx.Provider>
  );
}

export function useBlockedUsers(): BlockedUsersContextValue {
  const ctx = useContext(BlockedUsersCtx);
  if (!ctx) {
    throw new Error('useBlockedUsers must be used inside <BlockedUsersProvider>');
  }
  return ctx;
}
