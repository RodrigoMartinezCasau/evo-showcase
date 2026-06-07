/**
 * ConversationScreen — hilo de shares con un amigo (sin texto libre).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { BOTTOM_BAR_LAYOUT, getBottomBarScrollContentPaddingBottom } from '@evoconn/constants/bottomBarLayout';
import { getMainColumnHeightForFloatingBottomBar } from '@evoconn/constants/appShellLayout';
import { useDeferredRender } from '@evoconn/hooks/useDeferredRender';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import { useMessages } from '@evoconn/hooks/MessagesContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import {
  fetchProfilesBatch,
  fetchPostsByIds,
  isRealUserId,
  type BasicProfile,
} from '@evoconn/services/supabaseSocial';
import {
  fetchSharedItemsForConversation,
  otherParticipantId,
} from '@evoconn/services/supabaseMessaging';
import type { SharedItem } from '@evoconn/types/messaging';
import { SharedItemBubble } from '@evoconn/components/messaging/SharedItemBubble';
import { supabase } from '../../mobile/lib/supabase';
import { simPostToCommunityPost } from '@evoconn/hooks/useFeedStore';
import type { CommunityPost } from '@evoconn/types';
import { navigateToCommunityPost, navigateToUserProfile } from '@evoconn/utils/notificationNavigation';
import { formatProfileUsername } from '@evoconn/state/otherProfileCache';

const BG = '#0b0b0f';

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = typeof params.id === 'string' ? params.id : '';
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();
  const { activeUserId, ingestPostsByIds } = useSimulation();
  const { markConversationRead } = useMessages();
  const { getPostById } = useFeedStore();
  const { thoughts } = useThoughts();
  const ready = useDeferredRender();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherProfile, setOtherProfile] = useState<BasicProfile | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [postsById, setPostsById] = useState<Record<string, CommunityPost>>({});
  const [profilesById, setProfilesById] = useState<Record<string, BasicProfile>>({});
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    setLoading(true);
  }, [conversationId, activeUserId]);

  useFocusEffect(
    useCallback(() => {
      if (!conversationId || !isRealUserId(activeUserId)) {
        setItems([]);
        setLoading(false);
        return;
      }

      let cancelled = false;

      void (async () => {
        if (!hasLoadedOnceRef.current) setLoading(true);
        try {
          const { data: convData } = await supabase
            .from('shared_conversations')
            .select('*')
            .eq('id', conversationId)
            .maybeSingle();

          const conv = convData
            ? {
                id: convData.id,
                userLowId: convData.user_low_id,
                userHighId: convData.user_high_id,
                createdAt: convData.created_at,
                updatedAt: convData.updated_at,
              }
            : null;

          const rows = await fetchSharedItemsForConversation(conversationId);
          if (cancelled) return;
          setItems(rows);

          const resolvedOtherId = conv
            ? otherParticipantId(conv, activeUserId)
            : null;
          setOtherUserId(resolvedOtherId);

          if (resolvedOtherId) {
            const profiles = await fetchProfilesBatch([resolvedOtherId]);
            if (!cancelled) setOtherProfile(profiles[0] ?? null);
          }

          const postIds = [...new Set(rows.filter((r) => r.postId).map((r) => r.postId!))];
          const profileIds = [
            ...new Set(rows.filter((r) => r.profileUserId).map((r) => r.profileUserId!)),
          ];

          const postMap: Record<string, CommunityPost> = {};
          for (const id of postIds) {
            const cached = getPostById(id);
            if (cached) postMap[id] = cached;
          }
          const missingPostIds = postIds.filter((id) => !postMap[id]);
          if (missingPostIds.length > 0) {
            const simPosts = await fetchPostsByIds(missingPostIds);
            simPosts.forEach((p) => {
              postMap[p.id] = simPostToCommunityPost(p);
            });
          }
          if (!cancelled) setPostsById(postMap);

          if (profileIds.length > 0) {
            const profs = await fetchProfilesBatch(profileIds);
            if (!cancelled) {
              const pmap: Record<string, BasicProfile> = {};
              profs.forEach((p) => {
                pmap[p.id] = p;
              });
              setProfilesById(pmap);
            }
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
            hasLoadedOnceRef.current = true;
          }
        }
      })();

      void markConversationRead(conversationId);

      return () => {
        cancelled = true;
      };
    }, [conversationId, activeUserId, getPostById, markConversationRead]),
  );

  const listPanelHeight =
    getMainColumnHeightForFloatingBottomBar(
      screenH,
      insets.top,
      insets.bottom,
      safeFrame.height,
    ) - BOTTOM_BAR_LAYOUT.FLOATING_BAR_STACK_SUBHEADER_HEIGHT;

  const headerUsername = otherProfile?.username
    ? formatProfileUsername(otherProfile.username)
    : otherUserId
      ? `@${otherUserId.slice(0, 8)}`
      : 'Conversación';

  const handleHeaderProfilePress = useCallback(() => {
    if (!otherUserId) return;
    navigateToUserProfile(router, otherUserId, otherProfile?.username ?? '');
  }, [router, otherUserId, otherProfile?.username]);

  const handleOpenPost = useCallback(
    (postId: string) => {
      void ingestPostsByIds([postId]).then(() => {
        navigateToCommunityPost(router, postId);
      });
    },
    [router, ingestPostsByIds],
  );

  const handleOpenProfile = useCallback(
    (userId: string) => {
      const uname = profilesById[userId]?.username ?? otherProfile?.username ?? '';
      navigateToUserProfile(router, userId, uname);
    },
    [router, profilesById, otherProfile],
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  const sidebarConversations = thoughts;
  const showLoading = !ready || (loading && !hasLoadedOnceRef.current);

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.titleHit}
          onPress={handleHeaderProfilePress}
          disabled={!otherUserId}
          activeOpacity={otherUserId ? 0.65 : 1}
        >
          <Text style={styles.screenTitle} numberOfLines={1}>
            {headerUsername}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: listPanelHeight, overflow: 'hidden' }}>
        {showLoading ? (
          <ClanLoadingDot />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingVertical: 12,
              paddingBottom: getBottomBarScrollContentPaddingBottom(
                insets.bottom,
                screenH,
                safeFrame.height,
              ),
            }}
            renderItem={({ item }) => (
              <SharedItemBubble
                item={item}
                myUserId={activeUserId}
                post={item.postId ? postsById[item.postId] : null}
                profile={item.profileUserId ? profilesById[item.profileUserId] : null}
                onOpenPost={handleOpenPost}
                onOpenProfile={handleOpenProfile}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  Comparte una publicación o un perfil desde el menú ⋮ para empezar.
                </Text>
              </View>
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
  titleHit: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingHorizontal: 32,
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
