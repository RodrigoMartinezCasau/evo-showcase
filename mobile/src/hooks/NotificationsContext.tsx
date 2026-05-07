/**
 * NotificationsContext — per-user, persistent, event-driven notifications.
 *
 * Architecture
 * ────────────
 * - A single in-memory database snapshot (keyed by userId) mirrors thoughtsStorage.
 * - Loaded once on mount from AsyncStorage; every mutation write-throughs atomically.
 * - `notifications` always reflects the ACTIVE user's slice.
 * - `addNotification` is called by useFeedStore (upvote), useFollowState (follow),
 *   and ReflectionDetailItem (comment) — the only real event sources.
 *
 * Provider must sit between SimulationProvider and FeedProvider/FollowProvider
 * in the tree so those child contexts can call `useNotifications()`.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  loadNotificationsDB,
  saveNotificationsDB,
  type AppNotification,
  type NotificationsDatabase,
  type NotificationType,
} from '@evoconn/services/notificationsStorage';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import {
  isRealUserId,
  fetchMyNotifications,
  insertNotification,
  markNotificationsRead,
} from '@evoconn/services/supabaseSocial';
import { supabase } from '../../mobile/lib/supabase';
import { showLocalNotification, registerPushToken } from '@evoconn/services/pushNotifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddNotificationArgs = {
  recipientUserId: string;
  type: NotificationType;
  fromUserId: string;
  fromUsername: string;
  targetPostId?: string;
  targetCommentId?: string;
  textPreview?: string;
};

export type NotificationsContextValue = {
  /** Notifications for the currently active user, newest first. */
  notifications: AppNotification[];
  /** Count of unread notifications for the active user. */
  unreadCount: number;
  /** Emit a notification for another user (no-op if recipient === sender). */
  addNotification: (args: AddNotificationArgs) => void;
  /** Mark all active user's notifications as read (call on screen open). */
  markAllRead: () => void;
  /** Reload from Supabase / AsyncStorage (e.g. when opening the notifications screen). */
  refreshNotifications: () => void;
};

function mapDbRowsToAppNotifications(rows: Awaited<ReturnType<typeof fetchMyNotifications>>): AppNotification[] {
  return rows.map((r) => ({
    id: r.id,
    type: r.type as NotificationType,
    fromUserId: r.from_user_id ?? '',
    fromUsername: r.from_username,
    targetPostId: r.post_id,
    targetCommentId: r.comment_id,
    textPreview: r.text_preview,
    createdAt: r.created_at,
    read: r.read,
  }));
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationsCtx = createContext<NotificationsContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { activeUserId } = useSimulation();

  const [db, setDb] = useState<NotificationsDatabase>({});
  const dbRef = useRef<NotificationsDatabase>({});

  useLayoutEffect(() => {
    dbRef.current = db;
  }, [db]);

  const refreshNotifications = useCallback(() => {
    if (isRealUserId(activeUserId)) {
      fetchMyNotifications(activeUserId).then((rows) => {
        setDb((prev) => ({ ...prev, [activeUserId]: mapDbRowsToAppNotifications(rows) }));
      });
    } else {
      loadNotificationsDB()
        .then((loaded) => setDb(loaded))
        .catch(() => {});
    }
  }, [activeUserId]);

  // Load notifications — Supabase for real users, AsyncStorage for sim users.
  useEffect(() => {
    refreshNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  // ── Register push token when a real user is active ───────────────────────
  useEffect(() => {
    if (!isRealUserId(activeUserId)) return;
    registerPushToken(activeUserId).catch(console.error);
  }, [activeUserId]);

  // ── Realtime subscription — new notifications arrive instantly ───────────
  useEffect(() => {
    if (!isRealUserId(activeUserId)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = supabase
      .channel(`notifications:${activeUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${activeUserId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const r = payload.new;
          const notif: AppNotification = {
            id: String(r.id ?? ''),
            type: (r.type as NotificationType) ?? 'upvote',
            fromUserId: String(r.from_user_id ?? ''),
            fromUsername: String(r.from_username ?? ''),
            targetPostId: r.post_id ? String(r.post_id) : undefined,
            targetCommentId: r.comment_id ? String(r.comment_id) : undefined,
            textPreview: r.text_preview ? String(r.text_preview) : undefined,
            createdAt: String(r.created_at ?? new Date().toISOString()),
            read: false,
          };
          setDb(prev => ({
            ...prev,
            [activeUserId]: [notif, ...(prev[activeUserId] ?? [])],
          }));
          // Only show native push (sound + vibration) for follow and comment.
          // Likes, dislikes and saves are shown in the in-app bell only.
          if (notif.type === 'follow' || notif.type === 'comment') {
            const titleMap: Record<string, string> = {
              comment: '💬 Nuevo comentario',
              follow: '✨ Nuevo seguidor',
            };
            const title = titleMap[notif.type] ?? 'EVO';
            const body = notif.fromUsername
              ? `${notif.fromUsername}${notif.textPreview ? `: "${notif.textPreview}"` : ''}`
              : 'Tienes una nueva notificación';
            showLocalNotification(title, body).catch(console.error);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeUserId]);

  // ── Core mutation (write-through) ────────────────────────────────────────

  const mutateSlice = useCallback(
    (userId: string, mutator: (prev: AppNotification[]) => AppNotification[]) => {
      setDb((prev) => {
        const next = { ...prev, [userId]: mutator(prev[userId] ?? []) };
        saveNotificationsDB(next).catch(() => {});
        return next;
      });
    },
    [],
  );

  // ── Public actions ───────────────────────────────────────────────────────

  const addNotification = useCallback(
    (args: AddNotificationArgs) => {
      // Never notify a user about their own actions.
      if (args.recipientUserId === args.fromUserId) return;

      const notif: AppNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: args.type,
        fromUserId: args.fromUserId,
        fromUsername: args.fromUsername,
        targetPostId: args.targetPostId,
        targetCommentId: args.targetCommentId,
        textPreview: args.textPreview,
        createdAt: new Date().toISOString(),
        read: false,
      };

      // Persist to Supabase for real users so the recipient sees it on any device.
      if (isRealUserId(args.recipientUserId)) {
        insertNotification({
          recipient_id:  args.recipientUserId,
          type:          args.type,
          from_user_id:  args.fromUserId,
          from_username: args.fromUsername,
          post_id:       args.targetPostId,
          comment_id:    args.targetCommentId,
          text_preview:  args.textPreview,
        });
      }

      mutateSlice(args.recipientUserId, (prev) => [notif, ...prev]);
    },
    [mutateSlice],
  );

  const markAllRead = useCallback(() => {
    markNotificationsRead(activeUserId); // update Supabase for real users
    mutateSlice(activeUserId, (prev) =>
      prev.every((n) => n.read) ? prev : prev.map((n) => ({ ...n, read: true })),
    );
  }, [activeUserId, mutateSlice]);

  // ── Derived values for active user ───────────────────────────────────────

  const notifications = useMemo(() => db[activeUserId] ?? [], [db, activeUserId]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, addNotification, markAllRead, refreshNotifications }),
    [notifications, unreadCount, addNotification, markAllRead, refreshNotifications],
  );

  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
