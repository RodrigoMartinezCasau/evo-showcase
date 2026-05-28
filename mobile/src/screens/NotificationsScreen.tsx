/**
 * NotificationsScreen — feed de notificaciones + bandeja de solicitudes de seguimiento.
 *
 * Las solicitudes pendientes vienen de `follow_requests` (una fila por usuario).
 * El bloque plegable bajo el título muestra el contador y, al pulsar, todas las solicitudes.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  type ListRenderItemInfo,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import { useDeferredRender } from '@evoconn/hooks/useDeferredRender';
import { useIncrementalList } from '@evoconn/hooks/useIncrementalList';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { BOTTOM_BAR_LAYOUT, getBottomBarScrollContentPaddingBottom } from '@evoconn/constants/bottomBarLayout';
import { getMainColumnHeightForFloatingBottomBar } from '@evoconn/constants/appShellLayout';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useIncomingFollowRequests } from '@evoconn/hooks/useIncomingFollowRequests';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
import { FollowRequestsInbox } from '@evoconn/components/notifications/FollowRequestsInbox';
import type { AppNotification } from '@evoconn/services/notificationsStorage';
import {
  acceptFollowRequestRpc,
  rejectFollowRequestRpc,
} from '@evoconn/services/supabaseSocial';
import {
  navigateToCommunityPost,
  navigateToUserProfile,
} from '@evoconn/utils/notificationNavigation';
const BG = '#0b0b0f';
const AVATAR_SIZE = 42;
const PROFILE_ICON_SCALE = 1.05;

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
  const handleContent = n.type === 'follow' ? () => onPressProfile(n) : () => onPressContent(n);

  return (
    <View style={[styles.row, !n.read && styles.rowUnread]}>
      {!n.read && <View style={styles.unreadDot} />}
      <TouchableOpacity onPress={() => onPressProfile(n)} activeOpacity={0.6} hitSlop={4}>
        <View style={styles.avatarWrap}>
          <UserAvatarFrame
            clanId={clanId}
            avatarUri={avatarUri}
            size={AVATAR_SIZE}
            iconScale={PROFILE_ICON_SCALE}
            deferRender
          />
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.textBlock} onPress={handleContent} activeOpacity={0.6}>
        <Text style={styles.actionText} numberOfLines={2}>
          <Text style={styles.username} onPress={() => onPressProfile(n)}>
            @{username}
          </Text>
          {' '}
          <Text>{actionLabel(n)}</Text>
        </Text>
        <Text style={styles.timestamp}>{relativeTime(n.createdAt)}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleContent} activeOpacity={0.6} hitSlop={8}>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
      </TouchableOpacity>
    </View>
  );
});

function EmptyState({ hasFollowRequests }: { hasFollowRequests: boolean }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="notifications-off-outline" size={44} color="rgba(255,255,255,0.18)" />
      <Text style={styles.emptyText}>
        {hasFollowRequests
          ? 'No tienes más notificaciones'
          : 'No tienes notificaciones todavía'}
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();
  const { notifications, markAllRead, refreshNotifications } = useNotifications();
  const { users, refreshSocialFromSupabase } = useSimulation();
  const { thoughts } = useThoughts();
  const { requests: incomingRequests, refresh: refreshIncomingRequests, removeRequester } =
    useIncomingFollowRequests();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const ready = useDeferredRender();
  const [busyRequesterId, setBusyRequesterId] = useState<string | null>(null);

  const feedNotifications = useMemo(
    () => notifications.filter((n) => n.type !== 'follow_request'),
    [notifications],
  );

  const {
    visibleData: visibleNotifications,
    hasMore: hasMoreNotifications,
    loadMore: loadMoreNotifications,
  } = useIncrementalList(feedNotifications, 15);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        await Promise.all([refreshNotifications(), refreshIncomingRequests()]);
        if (!cancelled) markAllRead();
      })();
      return () => {
        cancelled = true;
        markAllRead();
      };
    }, [refreshNotifications, refreshIncomingRequests, markAllRead]),
  );

  const handlePressProfile = useCallback(
    (n: AppNotification) => {
      navigateToUserProfile(router, n.fromUserId, n.fromUsername);
    },
    [router],
  );

  const handlePressProfileRequest = useCallback(
    (requesterId: string, username: string) => {
      navigateToUserProfile(router, requesterId, username);
    },
    [router],
  );

  const handleAcceptFollowRequest = useCallback(
    async (requesterId: string) => {
      if (busyRequesterId) return;
      setBusyRequesterId(requesterId);
      removeRequester(requesterId);
      try {
        const ok = await acceptFollowRequestRpc(requesterId);
        if (ok) {
          await Promise.all([
            refreshIncomingRequests(),
            refreshNotifications(),
            refreshSocialFromSupabase(),
          ]);
        } else {
          Alert.alert(
            'Solicitud no disponible',
            'Esta solicitud ya no está pendiente (puede que se haya cancelado). Hemos actualizado la lista.',
          );
          await refreshIncomingRequests();
        }
      } finally {
        setBusyRequesterId(null);
      }
    },
    [
      busyRequesterId,
      removeRequester,
      refreshIncomingRequests,
      refreshNotifications,
      refreshSocialFromSupabase,
    ],
  );

  const handleRejectFollowRequest = useCallback(
    async (requesterId: string) => {
      if (busyRequesterId) return;
      setBusyRequesterId(requesterId);
      removeRequester(requesterId);
      try {
        const ok = await rejectFollowRequestRpc(requesterId);
        if (!ok) {
          await refreshIncomingRequests();
        } else {
          await Promise.all([refreshIncomingRequests(), refreshNotifications()]);
        }
      } finally {
        setBusyRequesterId(null);
      }
    },
    [busyRequesterId, removeRequester, refreshIncomingRequests, refreshNotifications],
  );

  const handlePressContent = useCallback(
    (n: AppNotification) => {
      if (n.targetPostId) {
        navigateToCommunityPost(router, n.targetPostId, n.targetCommentId);
        return;
      }
      navigateToUserProfile(router, n.fromUserId, n.fromUsername);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AppNotification>) => {
      const user = users[item.fromUserId];
      return (
        <NotificationRow
          notification={item}
          clanId={user?.clanId ?? null}
          onPressProfile={handlePressProfile}
          onPressContent={handlePressContent}
        />
      );
    },
    [users, handlePressProfile, handlePressContent],
  );

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  const Separator = useCallback(() => <View style={styles.separator} />, []);

  const listPanelHeight =
    getMainColumnHeightForFloatingBottomBar(
      screenH,
      insets.top,
      insets.bottom,
      safeFrame.height,
    ) - BOTTOM_BAR_LAYOUT.FLOATING_BAR_STACK_SUBHEADER_HEIGHT;

  const listHeader = useMemo(
    () => (
      <FollowRequestsInbox
        requests={incomingRequests}
        busyRequesterId={busyRequesterId}
        onPressProfile={handlePressProfileRequest}
        onAccept={handleAcceptFollowRequest}
        onReject={handleRejectFollowRequest}
      />
    ),
    [
      incomingRequests,
      busyRequesterId,
      handlePressProfileRequest,
      handleAcceptFollowRequest,
      handleRejectFollowRequest,
    ],
  );

  const showEmpty =
    feedNotifications.length === 0 && incomingRequests.length === 0;

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>NOTIFICACIONES</Text>
      </View>

      {incomingRequests.length > 0 ? listHeader : null}

      <View style={{ height: listPanelHeight, overflow: 'hidden' }}>
        {!ready ? (
          <ClanLoadingDot />
        ) : (
        <FlatList
          style={{ flex: 1 }}
          data={visibleNotifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={Separator}
          onEndReached={loadMoreNotifications}
          onEndReachedThreshold={0.5}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
          ListFooterComponent={hasMoreNotifications ? <ClanLoadingDot inline /> : null}
          ListEmptyComponent={
            showEmpty ? (
              <EmptyState hasFollowRequests={false} />
            ) : (
              <EmptyState hasFollowRequests={incomingRequests.length > 0} />
            )
          }
          contentContainerStyle={
            showEmpty
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
        )}
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
});
