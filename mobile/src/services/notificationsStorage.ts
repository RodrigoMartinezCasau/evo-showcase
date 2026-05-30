/**
 * notificationsStorage.ts — per-user persistent notification database.
 *
 * Storage model
 * ─────────────
 * ONE AsyncStorage key holds all users' notifications:
 *   @physicscopilot/notifications_v1  →  { [userId]: AppNotification[] }
 *
 * Same single-key pattern as thoughtsStorage.ts / userStatsStorage.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'upvote_post'
  | 'follow'
  | 'follow_request'
  | 'comment'
  | 'comment_reply'
  | 'upvote_comment';

export type AppNotification = {
  id: string;
  type: NotificationType;
  fromUserId: string;
  fromUsername: string;
  targetPostId?: string;
  targetCommentId?: string;
  /** Short text preview (used for comment notifications). */
  textPreview?: string;
  createdAt: string;
  read: boolean;
};

export type NotificationsDatabase = Record<string, AppNotification[]>;

// ─── Key ──────────────────────────────────────────────────────────────────────

const KEY = '@physicscopilot/notifications_v1';

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidNotification(x: unknown): x is AppNotification {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.type === 'string' &&
    typeof o.fromUserId === 'string' &&
    typeof o.fromUsername === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.read === 'boolean'
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function loadNotificationsDB(): Promise<NotificationsDatabase> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const db: NotificationsDatabase = {};
    for (const [userId, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      db[userId] = list.filter(isValidNotification);
    }
    return db;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[NOTIFS] loadNotificationsDB failed:', err);
    return {};
  }
}

export async function saveNotificationsDB(db: NotificationsDatabase): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[NOTIFS] saveNotificationsDB failed — data will not persist:', err);
  }
}
