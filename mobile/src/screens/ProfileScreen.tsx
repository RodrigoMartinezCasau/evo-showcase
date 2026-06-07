import React, { useCallback, useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Easing, useWindowDimensions, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter, usePathname, useFocusEffect } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { sanitizeRouteId } from '@evoconn/utils/sanitizeRouteId';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getOtherUserProfile } from '@evoconn/data/mockOtherUsers';
import type { OtherUserProfile } from '@evoconn/data/mockOtherUsers';
import { supabase } from '../../mobile/lib/supabase';
import { isPublishedSimPostType } from '@evoconn/data/simulation/simulatedNetwork';
import {
  fetchFollowCounts,
  fetchPostsByUser,
  fetchProfilesBatch,
  isRealUserId,
  type BasicProfile,
} from '@evoconn/services/supabaseSocial';
import { simPostToCommunityPost, useFeedStore } from '@evoconn/hooks/useFeedStore';
import type { SimPost } from '@evoconn/data/simulation/simulatedNetwork';
import type { Rank } from '@evoconn/types';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { useDeferredRender } from '@evoconn/hooks/useDeferredRender';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';
import {
  PROFILE_IDENTITY_SECTION_GAP,
  PROFILE_INSIGNIA_CARD_MIN_HEIGHT,
} from '@evoconn/constants/personalProfileLayout';
import { getProfileRankFromPercentages } from '@evoconn/utils/getRankFromPct';
import {
  OtherProfileFollowRow,
  UserIdentityHeader,
  UserInsigniaPhrase,
  PhilosophyPercentagesPanel,
  UserTotalsStats,
  RecentPostsSlider,
} from '@evoconn/components/otherProfile';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import {
  otherProfileCache,
  type OtherProfileCacheEntry,
} from '@evoconn/state/otherProfileCache';
import type { CommunityPost } from '@evoconn/types';
import { enrichPostsAuthorAvatar } from '@evoconn/utils/enrichPostsAuthorAvatar';
import { buildProfileShareMessage } from '@evoconn/utils/appShareLinks';
import {
  ProfileShareCaptureHost,
  type ProfileShareCaptureHandle,
} from '@evoconn/components/personalProfile/ProfileShareCaptureHost';

const ANIM_DURATION = 200;

function mapAuthorPostsToCommunity(
  posts: SimPost[],
  authorId: string,
  author: {
    username: string | null;
    clanId: string | null | undefined;
    rank?: string | null;
    avatarUri?: string;
  },
): CommunityPost[] {
  const profileCache: Record<string, BasicProfile> = {
    [authorId]: {
      id: authorId,
      username: author.username ?? '?',
      clanId: author.clanId ?? null,
      rank: (author.rank as Rank | undefined) ?? 'aprendiz',
      avatarUri: author.avatarUri,
    },
  };
  return posts.map((p) => simPostToCommunityPost(p, profileCache));
}

/** Si el caché del perfil no trae foto de fondo, reutiliza la del feed global. */
function mergePostsWithFeedImages(
  posts: CommunityPost[],
  feedPosts: CommunityPost[],
  authorId: string,
): CommunityPost[] {
  const feedById = new Map(
    feedPosts.filter((p) => p.author.id === authorId).map((p) => [p.id, p]),
  );
  if (feedById.size === 0) return posts;
  return posts.map((p) => {
    if (p.imageUrl) return p;
    const fromFeed = feedById.get(p.id);
    if (!fromFeed?.imageUrl) return p;
    return {
      ...p,
      imageUrl: fromFeed.imageUrl,
      imageWidth: fromFeed.imageWidth ?? null,
      imageHeight: fromFeed.imageHeight ?? null,
      imageCropFocusY: fromFeed.imageCropFocusY ?? null,
      imageCropFocusYFollowing: fromFeed.imageCropFocusYFollowing ?? null,
      imageShowParaTi: fromFeed.imageShowParaTi ?? null,
      imageShowSiguiendo: fromFeed.imageShowSiguiendo ?? null,
      audioTrackId: p.audioTrackId ?? fromFeed.audioTrackId ?? null,
      audioVolume: p.audioVolume ?? fromFeed.audioVolume ?? null,
    };
  });
}

export default function ProfileScreen() {
  const { id: rawId, username: initialUsername } = useLocalSearchParams<{ id?: string; username?: string }>();
  const id = sanitizeRouteId(rawId);
  const router = useRouter();
  const isOwn = !id || id === mockCurrentUser.id;

  // Perfil propio (incluye enlaces compartidos a tu propio perfil): el display
  // bueno es el personal `/my-profile`, no el antiguo OwnProfileView. Es justo
  // lo que pasa al pulsar tu propio nombre de usuario en Para ti.
  if (isOwn) {
    return <Redirect href="/my-profile" />;
  }

  return <OtherUserProfileView userId={id} router={router} initialUsername={initialUsername} />;
}

function OtherUserProfileView({ userId, router, initialUsername }: { userId: string; router: ReturnType<typeof useRouter>; initialUsername?: string }) {
  const pathname = usePathname();
  // Try the 9-user simulation first; if not found, fetch from Supabase.
  const mockProfile = getOtherUserProfile(userId);
  const seededCache = otherProfileCache.get(userId);
  const [supabaseProfile, setSupabaseProfile] = useState<OtherUserProfile | null>(seededCache?.profile ?? null);
  const [supabasePosts, setSupabasePosts] = useState<CommunityPost[]>(seededCache?.posts ?? []);
  const [targetIsPrivate, setTargetIsPrivate] = useState(seededCache?.isPrivate ?? false);
  const {
    followGraph,
    activeUserId: viewerId,
    posts: allSimPosts,
    users: simUsers,
    recordPostView,
    ensurePostViewCounts,
  } = useSimulation();
  const { posts: feedPosts } = useFeedStore();
  const followGraphRef = useRef(followGraph);
  followGraphRef.current = followGraph;

  const { recordProfileVisit } = useRecommendationTaste();
  useEffect(() => {
    if (!userId || userId === viewerId) return;
    recordProfileVisit(userId);
  }, [userId, viewerId, recordProfileVisit]);

  /** Snapshot from API + whether the viewer already followed the target at fetch time — for instant follower delta. */
  const [followCountSnap, setFollowCountSnap] = useState<{
    followers: number;
    following: number;
    iFollowed: boolean;
  } | null>(seededCache?.followSnap ?? null);

  // Al cambiar de usuario, re-sembramos desde caché (no a vacío) para que el
  // perfil aparezca al instante con lo último visto mientras refrescamos.
  useLayoutEffect(() => {
    const c = otherProfileCache.get(userId);
    setSupabaseProfile(c?.profile ?? null);
    setSupabasePosts(c?.posts ?? []);
    setFollowCountSnap(c?.followSnap ?? null);
    setTargetIsPrivate(c?.isPrivate ?? false);
  }, [userId]);

  // Fetcher refactored so we can invoke it both on userId change and on
  // screen focus (Ventana 3 close: when you come back to a profile, you
  // want the latest clan/percentages, not what you cached 2 minutes ago).
  const reloadOtherProfile = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (mockProfile || !isRealUserId(userId)) return;
      const [profileRes, countsRes, postsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, clan_id, rank, insignia_phrase, total_reflections, total_quotes, is_private, avatar_url, clan_percentages')
          .eq('id', userId)
          .maybeSingle(),
        fetchFollowCounts(userId),
        fetchPostsByUser(userId),
      ]);

      if (signal?.cancelled) return;

      const data = profileRes?.data ?? null;
      const counts = countsRes ?? { followersCount: 0, followingCount: 0 };
      const posts = postsRes ?? [];

      const vid = followGraphRef.current;
      const iFollowed =
        isRealUserId(viewerId) && isRealUserId(userId)
          ? (vid[viewerId]?.has(userId) ?? false)
          : false;

      let builtProfile: OtherUserProfile | null = null;
      let builtSnap: OtherProfileCacheEntry['followSnap'] = null;
      let builtIsPrivate = false;
      if (data) {
        builtIsPrivate = Boolean((data as { is_private?: boolean }).is_private);
        builtSnap = {
          followers: counts.followersCount,
          following: counts.followingCount,
          iFollowed,
        };
        setTargetIsPrivate(builtIsPrivate);
        setFollowCountSnap(builtSnap);
        const remotePcts = Array.isArray((data as { clan_percentages?: unknown }).clan_percentages)
          ? ((data as { clan_percentages: unknown[] }).clan_percentages as { clanId: string; label: string; pct: number }[])
          : [];
        builtProfile = {
          id: data.id,
          username: '@' + (data.username ?? '').toUpperCase(),
          clanId: data.clan_id ?? null,
          rank: data.rank ?? 'aprendiz',
          followersCount: counts.followersCount,
          followingCount: counts.followingCount,
          insigniaPhrase: data.insignia_phrase ?? '',
          philosophyPercentages: remotePcts,
          totalReflections: data.total_reflections ?? 0,
          totalQuotes: data.total_quotes ?? 0,
          recentPosts: [],
          avatarUri: (data as { avatar_url?: string | null }).avatar_url ?? null,
        };
        setSupabaseProfile(builtProfile);
      }
      const resolvedUsername = data?.username
        ? '@' + data.username.toUpperCase()
        : null;
      const authorAvatar =
        (data as { avatar_url?: string | null } | null | undefined)?.avatar_url ?? undefined;
      const builtPosts = mapAuthorPostsToCommunity(posts, userId, {
        username: resolvedUsername,
        clanId: data?.clan_id ?? posts[0]?.authorClanId,
        rank: data?.rank ?? posts[0]?.authorRank,
        avatarUri: authorAvatar,
      });
      setSupabasePosts(builtPosts);

      // Stale-while-revalidate: persist the freshest snapshot for instant reopen.
      if (builtProfile) {
        otherProfileCache.set(userId, {
          profile: builtProfile,
          posts: builtPosts,
          isPrivate: builtIsPrivate,
          followSnap: builtSnap,
          partial: false,
        });
      }
    },
    [userId, mockProfile, viewerId],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void reloadOtherProfile(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [reloadOtherProfile]);

  // Refresh whenever the screen regains focus (closes Ventana 3 — the
  // "I'm seeing a stale clan because I opened the profile 2 min ago"
  // problem). Cheap because the queries hit indexed columns.
  useFocusEffect(
    useCallback(() => {
      const signal = { cancelled: false };
      void reloadOtherProfile(signal);
      return () => {
        signal.cancelled = true;
      };
    }, [reloadOtherProfile]),
  );

  // Static profile data (username, rank, insignia, etc.)
  // Falls back to supabaseProfile for real users, or first mock user as last resort.
  const loadingUsername = initialUsername
    ? (initialUsername.startsWith('@') ? initialUsername.toUpperCase() : `@${initialUsername.toUpperCase()}`)
    : '?';

  const baseProfile = mockProfile ?? supabaseProfile ?? {
    id: userId,
    username: loadingUsername,
    clanId: null,
    rank: 'aprendiz' as const,
    followersCount: 0,
    followingCount: 0,
    insigniaPhrase: '',
    philosophyPercentages: [],
    totalReflections: 0,
    totalQuotes: 0,
    recentPosts: [],
  };

  const iFollowTargetNow =
    isRealUserId(viewerId) && isRealUserId(userId)
      ? (followGraph[viewerId]?.has(userId) ?? false)
      : false;

  const isProfileLocked =
    isRealUserId(userId) &&
    !mockProfile &&
    targetIsPrivate &&
    !iFollowTargetNow &&
    isRealUserId(viewerId) &&
    viewerId !== userId;

  // Source of truth for clan + percentages:
  //   • SIM users (u1..u9): local ClassificationContext (the device "plays"
  //     them, so the local store is authoritative).
  //   • REAL users (other Supabase accounts): the public copy on
  //     `profiles.clan_id` / `clan_percentages`, which EffectiveClanSync
  //     keeps up to date for the user that owns it. Without this we'd
  //     overwrite the remote values with the viewer's (always-empty) local
  //     classification for that userId — that was the root cause of "other
  //     users always look Sin clan / lime-green".
  const classification = useClassification();
  const isSimUser = !!mockProfile;
  const profile = isSimUser
    ? {
        ...baseProfile,
        clanId: classification.getVisibleClanId(userId),
        rank: classification.getPercentageRank(userId),
        philosophyPercentages: classification.getPercentages(userId),
      }
    : baseProfile;

  const profileWithResolvedRank = useMemo(
    () => ({
      ...profile,
      rank: getProfileRankFromPercentages(
        profile.clanId,
        profile.philosophyPercentages,
        profile.rank,
      ),
    }),
    [profile],
  );

  const profileWithLiveFollowers = useMemo(() => {
    if (mockProfile || !isRealUserId(userId) || !followCountSnap) return profileWithResolvedRank;
    const adj =
      followCountSnap.followers +
      (iFollowTargetNow ? 1 : 0) -
      (followCountSnap.iFollowed ? 1 : 0);
    return {
      ...profileWithResolvedRank,
      followersCount: Math.max(0, adj),
    };
  }, [profileWithResolvedRank, mockProfile, userId, followCountSnap, iFollowTargetNow]);

  const [batchAvatarUri, setBatchAvatarUri] = useState<string | null>(null);
  useEffect(() => {
    if (mockProfile || !isRealUserId(userId)) {
      setBatchAvatarUri(null);
      return;
    }
    let cancelled = false;
    void fetchProfilesBatch([userId]).then((rows) => {
      if (cancelled) return;
      const av = rows[0]?.avatarUri?.trim();
      if (!av) {
        setBatchAvatarUri(null);
        return;
      }
      setBatchAvatarUri(av);
      setSupabaseProfile((prev) => (prev ? { ...prev, avatarUri: av } : prev));
    });
    return () => {
      cancelled = true;
    };
  }, [userId, mockProfile]);

  const resolvedProfileAvatarUri = useMemo(() => {
    return (
      supabaseProfile?.avatarUri?.trim() ||
      (profileWithLiveFollowers as { avatarUri?: string | null }).avatarUri?.trim() ||
      batchAvatarUri?.trim() ||
      undefined
    );
  }, [supabaseProfile?.avatarUri, profileWithLiveFollowers, batchAvatarUri]);

  const livePosts = useMemo<CommunityPost[]>(
    () => {
      let list: CommunityPost[];
      if (isRealUserId(userId) && supabasePosts.length > 0) {
        list = mergePostsWithFeedImages(supabasePosts, feedPosts, userId);
      } else {
        const filtered = allSimPosts
          .filter((p) => p.authorId === userId && isPublishedSimPostType(p.type))
          .sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));
        list = mapAuthorPostsToCommunity(filtered, userId, {
          username: profileWithLiveFollowers.username,
          clanId: profileWithLiveFollowers.clanId,
          rank: profileWithLiveFollowers.rank,
          avatarUri: resolvedProfileAvatarUri,
        });
      }
      const username = profileWithLiveFollowers.username;
      if (username && username !== '?') {
        list = list.map((p) => ({
          ...p,
          author: { ...p.author, username },
        }));
      }
      return enrichPostsAuthorAvatar(list, userId, resolvedProfileAvatarUri);
    },
    [allSimPosts, userId, supabasePosts, feedPosts, resolvedProfileAvatarUri, profileWithLiveFollowers.username, profileWithLiveFollowers.clanId, profileWithLiveFollowers.rank],
  );

  const livePostIdsKey = useMemo(() => livePosts.map((p) => p.id).join(','), [livePosts]);
  useEffect(() => {
    if (livePostIdsKey) ensurePostViewCounts(livePostIdsKey.split(','));
  }, [livePostIdsKey, ensurePostViewCounts]);

  const profileAvatarUri = useMemo(() => {
    if (resolvedProfileAvatarUri) return resolvedProfileAvatarUri;
    return livePosts.find((p) => p.author.id === userId)?.author.avatarUri?.trim() || undefined;
  }, [resolvedProfileAvatarUri, livePosts, userId]);

  // Live totals that always match the publications slider count.
  const liveReflectionCount = useMemo(
    () => livePosts.filter((p) => p.type === 'reflection').length,
    [livePosts],
  );
  const liveQuoteCount = useMemo(
    () => livePosts.filter((p) => p.type === 'phrase').length,
    [livePosts],
  );

  const postsCountForRow = useMemo(() => {
    if (isProfileLocked) {
      return (
        (profileWithLiveFollowers.totalReflections ?? 0) +
        (profileWithLiveFollowers.totalQuotes ?? 0)
      );
    }
    return liveReflectionCount + liveQuoteCount;
  }, [
    isProfileLocked,
    profileWithLiveFollowers.totalReflections,
    profileWithLiveFollowers.totalQuotes,
    liveReflectionCount,
    liveQuoteCount,
  ]);

  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sharePreparing, setSharePreparing] = useState(false);
  const [identityCompanionBelowHeight, setIdentityCompanionBelowHeight] = useState(
    PROFILE_IDENTITY_SECTION_GAP + PROFILE_INSIGNIA_CARD_MIN_HEIGHT,
  );
  const profileShareCaptureRef = useRef<ProfileShareCaptureHandle>(null);
  const ready = useDeferredRender();
  const { thoughts } = useThoughts();

  const contentHeight = getAppShellScrollableBodyHeight(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

  // ─── Expanded post detail panel ────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [detailFeed, setDetailFeed] = useState<{
    data: CommunityPost[];
    initialIndex: number;
  } | null>(null);

  const openDetailFeed = useCallback(
    (posts: CommunityPost[], postId: string) => {
      const idx = posts.findIndex((p) => p.id === postId);
      setDetailFeed({ data: posts, initialIndex: idx >= 0 ? idx : 0 });
      slideAnim.setValue(0);
      requestAnimationFrame(() => {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [slideAnim],
  );

  const closeDetailFeed = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIM_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDetailFeed(null);
    });
  }, [slideAnim]);

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      recordPostView(post.id);
      openDetailFeed(livePosts, post.id);
    },
    [openDetailFeed, livePosts, recordPostView],
  );

  const handleSeeMoreRecentPosts = useCallback(() => {
    const rawUsername = profileWithLiveFollowers.username.replace(/^@/, '');
    router.push({
      pathname: '/latest-posts',
      params: { userId: profileWithLiveFollowers.id, username: rawUsername },
    });
  }, [router, profileWithLiveFollowers.id, profileWithLiveFollowers.username]);

  const handleDetailAuthorPress = useCallback(
    (authorId: string) => {
      if (authorId === mockCurrentUser.id) {
        navigateUnlessCurrent(pathname, '/my-profile');
      } else if (authorId === profile.id) {
        // Already viewing this user's profile — close the panel
        closeDetailFeed();
      } else {
        navigateUnlessCurrent(pathname, `/profile/${authorId}`);
      }
    },
    [closeDetailFeed, pathname, profile.id, router],
  );

  const handleDetailClanPress = useCallback(
    (clanId: string) => {
      const href = `/clan/${String(clanId).trim().toLowerCase()}`;
      navigateUnlessCurrent(pathname, href);
    },
    [pathname],
  );

  const handleBottomTabChange = useCallback((tab: TabId) => {
    if (detailFeed) {
      closeDetailFeed();
      return;
    }
    router.navigate({ pathname: '/(tabs)', params: { tab } });
  }, [detailFeed, closeDetailFeed, router]);

  const handleShareProfile = useCallback(async () => {
    if (sharePreparing) return;

    if (isProfileLocked) {
      try {
        await Share.share({
          message: buildProfileShareMessage(profile.username, profileWithLiveFollowers.id),
        });
      } catch {
        /* cancel */
      }
      return;
    }

    setSharePreparing(true);
    try {
      await profileShareCaptureRef.current?.share({
        width: screenW,
        userId: profileWithLiveFollowers.id,
        username: profile.username,
        clanId: profile.clanId,
        rank: profile.rank,
        avatarUri: profileAvatarUri,
        insigniaPhrase: profile.insigniaPhrase,
        followersCount: profileWithLiveFollowers.followersCount,
        followingCount: profileWithLiveFollowers.followingCount,
        totalPosts: postsCountForRow,
        totalReflections: profile.totalReflections ?? liveReflectionCount,
        totalQuotes: profile.totalQuotes ?? liveQuoteCount,
        rankReflectionCount: isSimUser
          ? classification.getReflectionCount(userId)
          : liveReflectionCount,
        rankPhraseCount: isSimUser
          ? classification.getPhraseCount(userId)
          : liveQuoteCount,
        philosophyPercentages: profile.philosophyPercentages,
        posts: livePosts,
      });
    } catch (e) {
      if (__DEV__) console.warn('[ProfileScreen] share:', e);
      Alert.alert('Error', 'No se pudo compartir el perfil. Inténtalo de nuevo.');
    } finally {
      setSharePreparing(false);
    }
  }, [
    sharePreparing,
    isProfileLocked,
    profile,
    profileWithLiveFollowers,
    screenW,
    postsCountForRow,
    liveReflectionCount,
    liveQuoteCount,
    isSimUser,
    classification,
    userId,
    livePosts,
    profileAvatarUri,
  ]);

  const handleInsigniaLayoutHeight = useCallback((height: number) => {
    setIdentityCompanionBelowHeight(PROFILE_IDENTITY_SECTION_GAP + height);
  }, []);

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
      />

      <View style={[styles.otherProfileWrap, { height: contentHeight }]}>
        <ReflectionBackground clan={profile.clanId}>
        {!ready ? (
          <ClanLoadingDot clanId={profile.clanId} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.otherContent}
            showsVerticalScrollIndicator={false}
          >
            <OtherProfileFollowRow
              userId={profileWithLiveFollowers.id}
              username={profileWithLiveFollowers.username}
              clanId={profileWithLiveFollowers.clanId}
              followersCount={profileWithLiveFollowers.followersCount}
              followingCount={profileWithLiveFollowers.followingCount}
              postsCount={postsCountForRow}
              avatarUri={profileAvatarUri}
            />
            <View style={styles.identityBlock}>
              <UserIdentityHeader
                userId={profileWithLiveFollowers.id}
                username={profileWithLiveFollowers.username}
                clanId={profileWithLiveFollowers.clanId}
                rank={profileWithLiveFollowers.rank}
                avatarUri={profileAvatarUri}
                companionBelowHeight={identityCompanionBelowHeight}
                onShieldPress={
                  profile.clanId
                    ? () =>
                        navigateUnlessCurrent(
                          pathname,
                          `/clan/${String(profile.clanId).trim().toLowerCase()}`,
                        )
                    : undefined
                }
              />
              <UserInsigniaPhrase
                phrase={profile.insigniaPhrase}
                clanId={profile.clanId}
                onLayoutHeight={handleInsigniaLayoutHeight}
              />
            </View>
            {isProfileLocked ? (
              <View style={styles.privateLock}>
                <Ionicons name="lock-closed" size={40} color="rgba(255,255,255,0.35)" />
                <Text style={styles.privateLockTitle}>Esta cuenta es privada</Text>
                <Text style={styles.privateLockSub}>
                  Sigue a esta persona para ver su filosofía y publicaciones.
                </Text>
              </View>
            ) : (
              <>
                <PhilosophyPercentagesPanel percentages={profile.philosophyPercentages} clanId={profile.clanId} />
                <UserTotalsStats
                  totalReflections={liveReflectionCount}
                  totalQuotes={liveQuoteCount}
                />
                <RecentPostsSlider
                  posts={livePosts}
                  onPostPress={handlePostPress}
                  onSeeMorePress={handleSeeMoreRecentPosts}
                />
              </>
            )}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
        </ReflectionBackground>

        {/* Expanded post viewer — slides in over profile content */}
        {detailFeed !== null && (
          <ProfileDetailPanel
            data={detailFeed.data}
            initialIndex={detailFeed.initialIndex}
            itemHeight={contentHeight}
            slideAnim={slideAnim}
            screenW={screenW}
            onClose={closeDetailFeed}
            onAuthorPress={handleDetailAuthorPress}
            onClanPress={handleDetailClanPress}
          />
        )}
      </View>

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          router.push({ pathname: '/reflection', params: { thoughtId: id } });
        }}
      />
      <ProfileShareCaptureHost ref={profileShareCaptureRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  identityBlock: {},
  header: { marginBottom: 20 },
  username: { color: evoconnColors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unassigned: { color: evoconnColors.text, fontWeight: '800', fontSize: 16 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, paddingVertical: 16, backgroundColor: evoconnColors.card, borderRadius: 12 },
  stat: { alignItems: 'center' },
  statValue: { color: evoconnColors.neonGreen, fontSize: 20, fontWeight: '700' },
  statLabel: { color: evoconnColors.muted, fontSize: 12, marginTop: 4 },
  quote: { marginBottom: 24 },
  quoteLabel: { color: evoconnColors.muted, fontSize: 12, marginBottom: 4 },
  quoteText: { color: evoconnColors.text, fontStyle: 'italic', fontSize: 14 },
  parchment: { borderWidth: 2, padding: 16, borderRadius: 12 },
  parchmentTitle: { color: evoconnColors.text, fontWeight: '700', marginBottom: 8 },
  parchmentBody: { color: evoconnColors.muted, fontSize: 14 },
  otherProfileWrap: {
    overflow: 'hidden',
  },
  otherContent: {
    paddingTop: 24,
    paddingBottom: 48,
    gap: 20,
  },
  bottomSpacer: {
    height: 20,
  },
  privateLock: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 28,
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  privateLockTitle: {
    color: evoconnColors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  privateLockSub: {
    color: evoconnColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
