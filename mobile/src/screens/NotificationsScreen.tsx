/**
 * NotificationsScreen — displays the active user's real notification feed.
 *
 * Design matches PersonalFollowersScreen / PersonalFollowingScreen:
 *   - background #0b0b0f
 *   - row-based FlatList with clan icon, username, action text, timestamp
 *   - same typography hierarchy (white username bold, muted meta)
 *
 * On focus: refresh, then mark all read (evita carrera con el fetch). Al perder el
 * foco se vuelve a marcar leídas para que el numerito de la campana se reinicie.
 * Tapping a notification navigates to the relevant content.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  type ListRenderItemInfo,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { BOTTOM_BAR_LAYOUT, getBottomBarScrollContentPaddingBottom } from '@evoconn/constants/bottomBarLayout';
import { getMainColumnHeightForFloatingBottomBar } from '@evoconn/constants/appShellLayout';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
import type { AppNotification } from '@evoconn/services/notificationsStorage';
import {
  acceptFollowRequestRpc,
  rejectFollowRequestRpc,
} from '@evoconn/services/supabaseSocial';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG = '#0b0b0f';
const AVATAR_SIZE = 42;
const PROFILE_ICON_SCALE = 1.05;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

function actionLabel(n: AppNotification): string {
  switch (n.type) {
    case 'upvote_post':
      return 'ha dado upvote a tu publicación';
    case 'follow':
      return 'ha empezado a seguirte';
    case 'follow_request':
      return 'quiere seguirte';
    case 'comment':
      return n.textPreview
        ? `ha comentado: "${n.textPreview.length > 60 ? n.textPreview.slice(0, 60) + '…' : n.textPreview}"`
        : 'ha comentado en tu publicación';
    case 'upvote_comment':
      return 'ha dado upvote a tu comentario';
    default:
      return 'ha interactuado contigo';
  }
}

// ─── Row component ────────────────────────────────────────────────────────────

type RowProps = {
  notification: AppNotification;
  clanId: string | null | undefined;
  avatarUri?: string | null;
  onPressProfile: (n: AppNotification) => void;
  onPressContent: (n: AppNotification) => void;
};

const NotificationRow = React.memo(function NotificationRow({
  notification: n,
  clanId,
  avatarUri,
  onPressProfile,
  onPressContent,
}: RowProps) {
  const username = n.fromUsername.replace(/^@+/, '');

  // Follow / solicitud: destino perfil.
  const handleContent = n.type === 'follow' || n.type === 'follow_request'
    ? () => onPressProfile(n)
    : () => onPressContent(n);

  return (
    <View style={[styles.row, !n.read && styles.rowUnread]}>
      {/* Unread indicator dot */}
      {!n.read && <View style={styles.unreadDot} />}

      {/* Avatar → always navigates to sender's profile */}
      <TouchableOpacity
        onPress={() => onPressProfile(n)}
        activeOpacity={0.6}
        hitSlop={4}
      >
        <View style={styles.avatarWrap}>
          <UserAvatarFrame
            clanId={clanId}
            avatarUri={avatarUri}
            size={AVATAR_SIZE}
            iconScale={PROFILE_ICON_SCALE}
          />
        </View>
      </TouchableOpacity>

      {/* Text block → content destination */}
      <TouchableOpacity
        style={styles.textBlock}
        onPress={handleContent}
        activeOpacity={0.6}
      >
        <Text style={styles.actionText} numberOfLines={2}>
          {/* Username within the text taps to profile */}
          <Text
            style={styles.username}
            onPress={() => onPressProfile(n)}
          >
            @{username}
          </Text>
          {' '}
          <Text>{actionLabel(n)}</Text>
        </Text>
        <Text style={styles.timestamp}>{relativeTime(n.createdAt)}</Text>
      </TouchableOpacity>

      {/* Chevron → content destination */}
      <TouchableOpacity onPress={handleContent} activeOpacity={0.6} hitSlop={8}>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
      </TouchableOpacity>
    </View>
  );
});

type FollowRequestRowProps = {
  notification: AppNotification;
  clanId: string | null | undefined;
  avatarUri?: string | null;
  onPressProfile: (n: AppNotification) => void;
  busy: boolean;
  onAccept: (n: AppNotification) => void;
  onReject: (n: AppNotification) => void;
};

const FollowRequestRow = React.memo(function FollowRequestRow({
  notification: n,
  clanId,
  avatarUri,
  onPressProfile,
  busy,
  onAccept,
  onReject,
}: FollowRequestRowProps) {
  const username = n.fromUsername.replace(/^@+/, '');

  return (
    <View style={[styles.row, !n.read && styles.rowUnread]}>
      {!n.read && <View style={styles.unreadDot} />}
      <TouchableOpacity
        onPress={() => onPressProfile(n)}
        activeOpacity={0.6}
        hitSlop={4}
      >
        <View style={styles.avatarWrap}>
          <UserAvatarFrame
            clanId={clanId}
            avatarUri={avatarUri}
            size={AVATAR_SIZE}
            iconScale={PROFILE_ICON_SCALE}
          />
        </View>
      </TouchableOpacity>
      <View style={styles.followRequestMid}>
        <TouchableOpacity
          style={styles.textBlock}
          onPress={() => onPressProfile(n)}
          activeOpacity={0.6}
        >
          <Text style={styles.actionText} numberOfLines={2}>
            <Text style={styles.username} onPress={() => onPressProfile(n)}>
              @{username}
            </Text>
            {' '}
            <Text>quiere seguirte</Text>
          </Text>
          <Text style={styles.timestamp}>{relativeTime(n.createdAt)}</Text>
        </TouchableOpacity>
        <View style={styles.followRequestActions}>
          <TouchableOpacity
            style={[styles.acceptBtn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => onAccept(n)}
            activeOpacity={0.75}
          >
            <Text style={styles.acceptBtnText}>{busy ? '…' : 'Aceptar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectBtn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => onReject(n)}
            activeOpacity={0.75}
          >
            <Text style={styles.rejectBtnText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="notifications-off-outline" size={44} color="rgba(255,255,255,0.18)" />
      <Text style={styles.emptyText}>No tienes notificaciones todavía</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();
  const { notifications, markAllRead, refreshNotifications } = useNotifications();
  const { users } = useSimulation();
  const { thoughts } = useThoughts();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requestActionBusy, setRequestActionBusy] = useState(false);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  // Evita carrera refresh vs mark: si el fetch termina después de markAllRead, antes
  // volvía a poner read:false y el badge no bajaba. Orden: fetch → marcar leídas.
  // Al salir, markAllRead otra vez por si el usuario sale antes de que acabe el fetch.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void refreshNotifications().then(() => {
        if (!cancelled) markAllRead();
      });
      return () => {
        cancelled = true;
        markAllRead();
      };
    }, [refreshNotifications, markAllRead]),
  );

  const handlePressProfile = useCallback(
    (n: AppNotification) => {
      router.push({ pathname: '/profile/[id]', params: { id: n.fromUserId } });
    },
    [router],
  );

  const handleAcceptFollowRequest = useCallback(
    async (n: AppNotification) => {
      if (requestActionBusy || !n.fromUserId) return;
      setRequestActionBusy(true);
      try {
        const ok = await acceptFollowRequestRpc(n.fromUserId);
        if (ok) await refreshNotifications();
      } finally {
        setRequestActionBusy(false);
      }
    },
    [requestActionBusy, refreshNotifications],
  );

  const handleRejectFollowRequest = useCallback(
    async (n: AppNotification) => {
      if (requestActionBusy || !n.fromUserId) return;
      setRequestActionBusy(true);
      try {
        const ok = await rejectFollowRequestRpc(n.fromUserId);
        if (ok) await refreshNotifications();
      } finally {
        setRequestActionBusy(false);
      }
    },
    [requestActionBusy, refreshNotifications],
  );

  const handlePressContent = useCallback(
    (n: AppNotification) => {
      if (n.targetPostId) {
        // Navigate to the community "Para Ti" tab — CommunityScreen opens
        // its own detail-feed overlay at the requested post, same UX as tapping
        // a post in the feed.
        router.push({
          pathname: '/(tabs)',
          params: { tab: 'para-ti', postId: n.targetPostId },
        });
        return;
      }
      // Fallback: go to sender's profile.
      router.push({ pathname: '/profile/[id]', params: { id: n.fromUserId } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AppNotification>) => {
      const user = users[item.fromUserId];
      if (item.type === 'follow_request') {
        return (
          <FollowRequestRow
            notification={item}
            clanId={user?.clanId ?? null}
            onPressProfile={handlePressProfile}
            busy={requestActionBusy}
            onAccept={handleAcceptFollowRequest}
            onReject={handleRejectFollowRequest}
          />
        );
      }
      return (
        <NotificationRow
          notification={item}
          clanId={user?.clanId ?? null}
          onPressProfile={handlePressProfile}
          onPressContent={handlePressContent}
        />
      );
    },
    [
      users,
      handlePressProfile,
      handlePressContent,
      requestActionBusy,
      handleAcceptFollowRequest,
      handleRejectFollowRequest,
    ],
  );

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  const Separator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  const listPanelHeight =
    getMainColumnHeightForFloatingBottomBar(
      screenH,
      insets.top,
      insets.bottom,
      safeFrame.height,
    ) - BOTTOM_BAR_LAYOUT.FLOATING_BAR_STACK_SUBHEADER_HEIGHT;

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      {/* Back arrow + title — same pattern as PersonalFollowersScreen */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>NOTIFICACIONES</Text>
      </View>

      <View style={{ height: listPanelHeight, overflow: 'hidden' }}>
        <FlatList
          style={{ flex: 1 }}
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={
            notifications.length === 0
              ? styles.emptyContainer
              : {
                  paddingBottom: getBottomBarScrollContentPaddingBottom(
                    insets.bottom,
                    screenH,
                    safeFrame.height,
                  ),
                }
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      <AppShellBottomTabsWrap
        backgroundColor="#0b0b0f"
        borderTopWidth={StyleSheet.hairlineWidth}
        borderTopColor="rgba(255,255,255,0.08)"
      >
        <BottomCommunityTabs activeTab={null} onTabChange={handleTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          const t = thoughts.find((x) => x.id === id);
          if (t?.type === 'phrase') {
            router.push({ pathname: '/phrase', params: { phraseId: id } });
          } else {
            router.push({ pathname: '/reflection', params: { thoughtId: id } });
          }
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    marginRight: 8,
  },
  screenTitle: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: BG,
  },
  rowUnread: {
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  unreadDot: {
    position: 'absolute',
    left: 5,
    top: '50%',
    marginTop: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c7ff02',
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  username: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 19,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 16 + AVATAR_SIZE + 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 220,
  },
  followRequestMid: {
    flex: 1,
    gap: 10,
  },
  followRequestActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(199,255,2,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,255,2,0.45)',
  },
  acceptBtnText: {
    color: '#c7ff02',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rejectBtnText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
