/**
 * MessagesContext — bandeja de shares entre amigos mutuos (sin texto libre).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import {
  fetchSharedInbox,
  fetchUnreadSharedCount,
  markSharedConversationRead,
  sendSharedItem as sendSharedItemApi,
} from '@evoconn/services/supabaseMessaging';
import type { SendSharedItemArgs, SharedInboxRow } from '@evoconn/types/messaging';
import { supabase } from '../../mobile/lib/supabase';

export type MessagesContextValue = {
  inbox: SharedInboxRow[];
  unreadCount: number;
  loading: boolean;
  refreshInbox: () => Promise<void>;
  sendSharedItem: (args: SendSharedItemArgs) => Promise<{ ok: boolean; error?: string }>;
  markConversationRead: (conversationId: string) => Promise<void>;
};

const MessagesCtx = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { activeUserId } = useSimulation();
  const [inbox, setInbox] = useState<SharedInboxRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const activeUserIdRef = useRef(activeUserId);

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  const refreshInbox = useCallback(async (): Promise<void> => {
    if (!isRealUserId(activeUserId)) {
      setInbox([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const [rows, unread] = await Promise.all([
        fetchSharedInbox(activeUserId),
        fetchUnreadSharedCount(activeUserId),
      ]);
      if (activeUserIdRef.current !== activeUserId) return;
      setInbox(rows);
      setUnreadCount(unread);
    } finally {
      if (activeUserIdRef.current === activeUserId) {
        setLoading(false);
      }
    }
  }, [activeUserId]);

  useEffect(() => {
    void refreshInbox();
  }, [refreshInbox]);

  useEffect(() => {
    if (!isRealUserId(activeUserId)) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        refreshInbox().catch(console.error);
      }, 500);
    });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      sub.remove();
    };
  }, [activeUserId, refreshInbox]);

  useEffect(() => {
    if (!isRealUserId(activeUserId)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = supabase
      .channel(`shared_items:${activeUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shared_items' },
        () => {
          refreshInbox().catch(console.error);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeUserId, refreshInbox]);

  const sendSharedItem = useCallback(
    async (args: SendSharedItemArgs): Promise<{ ok: boolean; error?: string }> => {
      if (!isRealUserId(activeUserId)) {
        return { ok: false, error: 'Inicia sesión con una cuenta real para enviar mensajes.' };
      }
      const result = await sendSharedItemApi(args);
      if (!result.ok) return { ok: false, error: result.error };
      await refreshInbox();
      return { ok: true };
    },
    [activeUserId, refreshInbox],
  );

  const markConversationRead = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!isRealUserId(activeUserId)) return;
      await markSharedConversationRead(conversationId);
      await refreshInbox();
    },
    [activeUserId, refreshInbox],
  );

  const value = useMemo<MessagesContextValue>(
    () => ({
      inbox,
      unreadCount,
      loading,
      refreshInbox,
      sendSharedItem,
      markConversationRead,
    }),
    [inbox, unreadCount, loading, refreshInbox, sendSharedItem, markConversationRead],
  );

  return <MessagesCtx.Provider value={value}>{children}</MessagesCtx.Provider>;
}

export function useMessages(): MessagesContextValue {
  const ctx = useContext(MessagesCtx);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
}
