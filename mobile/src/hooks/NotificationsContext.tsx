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
};

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

  // Load notifications — Supabase for real users, AsyncStorage for sim users.
  useEffect(() => {
    if (isRealUserId(activeUserId)) {
      fetchMyNotifications(activeUserId).then((rows) => {
        const notifs: AppNotification[] = rows.map((r) => ({
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
        setDb((prev) => ({ ...prev, [activeUserId]: notifs }));
      });
    } else {
      loadNotificationsDB()
        .then((loaded) => setDb(loaded))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    () => ({ notifications, unreadCount, addNotification, markAllRead }),
    [notifications, unreadCount, addNotification, markAllRead],
  );

  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
