import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '../../mobile/lib/AuthContext';
import {
  fetchBlockedUsers,
  fetchFollowers,
  fetchFollowing,
  fetchMyNotifications,
  fetchMyReports,
  fetchMySaves,
  fetchMyVotes,
  fetchPostsByUser,
  isRealUserId,
} from './supabaseSocial';
import type { SimPost } from '../data/simulation/simulatedNetwork';

const NOTIFS_KEY = '@evo/notifications_enabled';
const DATA_SAVER_KEY = '@evo/settings_data_saver';
const WIFI_ONLY_KEY = '@evo/settings_wifi_only_sync';

function serializePost(p: SimPost) {
  return {
    id: p.id,
    type: p.type,
    title: p.title ?? null,
    body: p.body,
    quoteAuthor: p.quoteAuthor ?? null,
    createdAt: p.createdAt,
    upvoteCount: p.upvoterIds.length,
    downvoteCount: p.downvoterIds.length,
  };
}

export type UserDataExportPayload = {
  exportVersion: 1;
  generatedAt: string;
  account: {
    userId: string;
    email: string | null;
    phone: string | null;
    profile: UserProfile | null;
  };
  posts: ReturnType<typeof serializePost>[];
  followingUserIds: string[];
  followerUserIds: string[];
  savedPostIds: string[];
  votesByPostId: Record<string, 'up' | 'down'>;
  blockedUsers: Awaited<ReturnType<typeof fetchBlockedUsers>>;
  reportsFiled: Awaited<ReturnType<typeof fetchMyReports>>;
  notifications: Awaited<ReturnType<typeof fetchMyNotifications>>;
  localAppPreferences: {
    notificationsEnabled: string | null;
    dataSaverEnabled: string | null;
    wifiOnlySync: string | null;
  };
};

export async function buildUserDataExport(params: {
  userId: string;
  profile: UserProfile | null;
  email: string | null;
  phone: string | null;
}): Promise<UserDataExportPayload | { error: string }> {
  const { userId, profile, email, phone } = params;
  if (!isRealUserId(userId)) {
    return {
      error:
        'Esta sesión es de demostración. Inicia sesión con tu cuenta EVO para generar una copia de tus datos.',
    };
  }

  const [
    posts,
    followingUserIds,
    followerUserIds,
    savedPostIds,
    votesByPostId,
    blockedUsers,
    reportsFiled,
    notifications,
    notifsRaw,
    dataSaverRaw,
    wifiOnlyRaw,
  ] = await Promise.all([
    fetchPostsByUser(userId),
    fetchFollowing(userId),
    fetchFollowers(userId),
    fetchMySaves(userId),
    fetchMyVotes(userId),
    fetchBlockedUsers(userId),
    fetchMyReports(userId),
    fetchMyNotifications(userId),
    AsyncStorage.getItem(NOTIFS_KEY),
    AsyncStorage.getItem(DATA_SAVER_KEY),
    AsyncStorage.getItem(WIFI_ONLY_KEY),
  ]);

  return {
    exportVersion: 1,
    generatedAt: new Date().toISOString(),
    account: {
      userId,
      email,
      phone,
      profile,
    },
    posts: posts.map(serializePost),
    followingUserIds,
    followerUserIds,
    savedPostIds,
    votesByPostId,
    blockedUsers,
    reportsFiled,
    notifications,
    localAppPreferences: {
      notificationsEnabled: notifsRaw,
      dataSaverEnabled: dataSaverRaw,
      wifiOnlySync: wifiOnlyRaw,
    },
  };
}
