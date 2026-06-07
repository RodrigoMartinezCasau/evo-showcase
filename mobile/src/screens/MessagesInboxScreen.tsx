/**
 * MessagesInboxScreen — lista de conversaciones (solo shares, sin texto).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { BOTTOM_BAR_LAYOUT, getBottomBarScrollContentPaddingBottom } from '@evoconn/constants/bottomBarLayout';
import { getMainColumnHeightForFloatingBottomBar } from '@evoconn/constants/appShellLayout';
import { useDeferredRender } from '@evoconn/hooks/useDeferredRender';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
import { useMessages } from '@evoconn/hooks/MessagesContext';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import {
  fetchProfilesBatch,
  isRealUserId,
  type BasicProfile,
} from '@evoconn/services/supabaseSocial';
import type { SharedInboxRow } from '@evoconn/types/messaging';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { formatProfileUsername } from '@evoconn/state/otherProfileCache';

const BG = '#0b0b0f';
const AVATAR_SIZE = 44;

function previewForRow(row: SharedInboxRow, myUserId: string): string {
  const item = row.lastItem;
  if (!item) return 'Sin mensajes aún';
  const mine = item.senderId === myUserId;
  const prefix = mine ? 'Tú: ' : '';
  if (item.kind === 'post') return `${prefix}Compartió una publicación`;
  return `${prefix}Compartió un perfil`;
}

function relativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MessagesInboxScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();
  const { inbox, loading, refreshInbox, markAllInboxRead } = useMessages();
  const { activeUserId } = useSimulation();
  const { thoughts } = useThoughts();
  const ready = useDeferredRender();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, BasicProfile>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        await refreshInbox();
        if (!cancelled) await markAllInboxRead();
      })();
      return () => {
        cancelled = true;
      };
    }, [refreshInbox, markAllInboxRead]),
  );

  useEffect(() => {
    const ids = [...new Set(inbox.map((r) => r.otherUserId))].filter(isRealUserId);
    if (ids.length === 0) return;
    fetchProfilesBatch(ids).then((rows) => {
      const map: Record<string, BasicProfile> = {};
      rows.forEach((p) => {
        map[p.id] = p;
      });
      setProfiles(map);
    }).catch(console.error);
  }, [inbox]);

  const listPanelHeight =
    getMainColumnHeightForFloatingBottomBar(
      screenH,
      insets.top,
      insets.bottom,
      safeFrame.height,
    ) - BOTTOM_BAR_LAYOUT.FLOATING_BAR_STACK_SUBHEADER_HEIGHT;

  const handleOpenConversation = useCallback(
    (row: SharedInboxRow) => {
      navigateUnlessCurrent(pathname, `/conversation/${row.conversation.id}`);
    },
    [pathname],
  );

  const renderItem = useCallback(
    ({ item }: { item: SharedInboxRow }) => {
      const profile = profiles[item.otherUserId];
      const username = profile?.username
        ? formatProfileUsername(profile.username)
        : `@${item.otherUserId.slice(0, 8)}`;
      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => handleOpenConversation(item)}
        >
          <UserAvatarFrame
            clanId={profile?.clanId ?? null}
            avatarUri={profile?.avatarUri ?? null}
            size={AVATAR_SIZE}
            iconScale={1.05}
            deferRender
          />
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.username} numberOfLines={1}>
                {username}
              </Text>
              <Text style={styles.time}>
                {relativeTime(item.lastItem?.createdAt ?? item.conversation.updatedAt)}
              </Text>
            </View>
            <View style={styles.rowBottom}>
              <Text style={styles.preview} numberOfLines={1}>
                {previewForRow(item, activeUserId)}
              </Text>
              {item.unreadCount > 0 ? (
                <View style={styles.unreadDot} />
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [profiles, handleOpenConversation, activeUserId],
  );

  const empty = !loading && inbox.length === 0;

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  const sidebarConversations = thoughts;

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>MENSAJES</Text>
      </View>

      <View style={{ height: listPanelHeight, overflow: 'hidden' }}>
        {!ready || loading ? (
          <ClanLoadingDot />
        ) : (
          <FlatList
            data={inbox}
            keyExtractor={(item) => item.conversation.id}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingBottom: getBottomBarScrollContentPaddingBottom(
                insets.bottom,
                screenH,
                safeFrame.height,
              ),
              flexGrow: empty ? 1 : undefined,
            }}
            ListEmptyComponent={
              empty ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="chatbubbles-outline" size={44} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyTitle}>Sin conversaciones</Text>
                  <Text style={styles.emptyBody}>
                    Comparte publicaciones o perfiles con tus amigos desde el menú ⋮ de una
                    publicación o perfil.
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs activeTab={null} onTabChange={handleTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={sidebarConversations}
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
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  username: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  time: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  preview: {
    flex: 1,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 10,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
