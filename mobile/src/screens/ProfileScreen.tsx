import React, { useCallback, useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, usePathname, useFocusEffect } from 'expo-router';
import { pushUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser, mockUserStats } from '@evoconn/data/mockUser';
import { getOtherUserProfile } from '@evoconn/data/mockOtherUsers';
import type { OtherUserProfile } from '@evoconn/data/mockOtherUsers';
import { supabase } from '../../mobile/lib/supabase';
import { isPublishedSimPostType } from '@evoconn/data/simulation/simulatedNetwork';
import { fetchFollowCounts, fetchPostsByUser, isRealUserId } from '@evoconn/services/supabaseSocial';
import { AppTopBar, AppShellBottomTabsWrap, RankBadge, ClanBanner, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { getClanCardColor } from '@evoconn/theme/theme';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';
import {
  OtherProfileFollowRow,
  UserIdentityHeader,
  UserInsigniaPhrase,
  PhilosophyPercentagesPanel,
  UserTotalsStats,
  RecentPostsSlider,
} from '@evoconn/components/otherProfile';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import type { CommunityPost } from '@evoconn/types';

const ANIM_DURATION = 200;

export default function ProfileScreen() {
  const { id, username: initialUsername } = useLocalSearchParams<{ id?: string; username?: string }>();
  const router = useRouter();
  const isOwn = !id || id === mockCurrentUser.id;

  if (isOwn) {
    return <OwnProfileView />;
  }

  return <OtherUserProfileView userId={id} router={router} initialUsername={initialUsername} />;
}

function OwnProfileView() {
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const user = { ...mockCurrentUser, clanId: activeClan };
  const stats = mockUserStats;
  const clanColor = getClanCardColor(user.clanId);

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => {}} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.username}>{user.username}</Text>
          <View style={styles.badges}>
            {user.clanId ? (
              <ClanBanner clanId={user.clanId} shortLabel={user.clanId.toUpperCase()} />
            ) : (
              <Text style={styles.unassigned}>??</Text>
            )}
            <RankBadge rank={user.rank} />
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.dailyUsesLeft}</Text>
            <Text style={styles.statLabel}>Usos hoy</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.unlockedPhrases}/{stats.unlockedPhrasesTotal}</Text>
            <Text style={styles.statLabel}>Frases</Text>
          </View>
        </View>
        <View style={styles.quote}>
          <Text style={styles.quoteLabel}>Cita</Text>
          <Text style={styles.quoteText}>"La vida es lo que pasa mientras diseñas tu reflexión."</Text>
        </View>
        <View style={[styles.parchment, { borderColor: clanColor }]}>
          <Text style={styles.parchmentTitle}>
            {user.clanId ? `Clan ${user.clanId}` : 'Sin clan'}
          </Text>
          <Text style={styles.parchmentBody}>Contenido del clan y filosofía.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function OtherUserProfileView({ userId, router, initialUsername }: { userId: string; router: ReturnType<typeof useRouter>; initialUsername?: string }) {
  const pathname = usePathname();
  // Try the 9-user simulation first; if not found, fetch from Supabase.
  const mockProfile = getOtherUserProfile(userId);
  const [supabaseProfile, setSupabaseProfile] = useState<OtherUserProfile | null>(null);
  const [supabasePosts, setSupabasePosts] = useState<CommunityPost[]>([]);
  const [targetIsPrivate, setTargetIsPrivate] = useState(false);
  const {
    followGraph,
    activeUserId: viewerId,
    posts: allSimPosts,
    users: simUsers,
  } = useSimulation();
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
  } | null>(null);

  useLayoutEffect(() => {
    setFollowCountSnap(null);
    setTargetIsPrivate(false);
  }, [userId]);

  // Fetcher refactored so we can invoke it both on userId change and on
  // screen focus (Ventana 3 close: when you come back to a profile, you
  // want the latest clan/percentages, not what you cached 2 minutes ago).
  const reloadOtherProfile = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (mockProfile || !isRealUserId(userId)) return;
      const [{ data }, counts, posts] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, clan_id, rank, insignia_phrase, total_reflections, total_quotes, is_private, avatar_url, clan_percentages')
          .eq('id', userId)
          .maybeSingle(),
        fetchFollowCounts(userId),
        fetchPostsByUser(userId),
      ]);

      if (signal?.cancelled) return;

      const vid = followGraphRef.current;
      const iFollowed =
        isRealUserId(viewerId) && isRealUserId(userId)
          ? (vid[viewerId]?.has(userId) ?? false)
          : false;
      if (data) {
        const isPrivate = Boolean((data as { is_private?: boolean }).is_private);
        setTargetIsPrivate(isPrivate);
        setFollowCountSnap({
          followers: counts.followersCount,
          following: counts.followingCount,
          iFollowed,
        });
        const remotePcts = Array.isArray((data as { clan_percentages?: unknown }).clan_percentages)
          ? ((data as { clan_percentages: unknown[] }).clan_percentages as { clanId: string; label: string; pct: number }[])
          : [];
        setSupabaseProfile({
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
        });
      }
      const resolvedUsername = data?.username
        ? '@' + data.username.toUpperCase()
        : null;
      setSupabasePosts(posts.map(p => ({
        id: p.id,
        type: p.type,
        author: {
          id: p.authorId,
          username: resolvedUsername ?? (p.authorUsername && p.authorUsername.length < 36 ? p.authorUsername : '?'),
          clanId: p.authorClanId ?? null,
          rank: p.authorRank ?? 'aprendiz',
        },
        title: p.title,
        body: p.body,
        quoteAuthor: p.quoteAuthor,
        voteStats: { up: p.upvoterIds.length, down: p.downvoterIds.length, save: p.saverIds.length },
        createdAt: p.createdAt,
      })));
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
        rank: classification.getDisplayRank(userId),
        philosophyPercentages: classification.getPercentages(userId),
      }
    : baseProfile;

  const profileWithLiveFollowers = useMemo(() => {
    if (mockProfile || !isRealUserId(userId) || !followCountSnap) return profile;
    const adj =
      followCountSnap.followers +
      (iFollowTargetNow ? 1 : 0) -
      (followCountSnap.iFollowed ? 1 : 0);
    return {
      ...profile,
      followersCount: Math.max(0, adj),
    };
  }, [profile, mockProfile, userId, followCountSnap, iFollowTargetNow]);

  // For real Supabase users: use dedicated fetchPostsByUser result.
  // For simulated users: filter the global sim posts array.
  const livePosts = useMemo<CommunityPost[]>(
    () => {
      if (isRealUserId(userId) && supabasePosts.length > 0) {
        return supabasePosts;
      }
      return allSimPosts
        .filter((p) => p.authorId === userId && isPublishedSimPostType(p.type))
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0))
        .map((p): CommunityPost => {
          const author = simUsers[p.authorId];
          return {
            id: p.id,
            type: p.type,
            author: author
              ? { id: author.id, username: author.username, clanId: author.clanId, rank: author.rank }
              : { id: p.authorId, username: p.authorUsername ?? '?', clanId: p.authorClanId ?? null, rank: p.authorRank ?? 'aprendiz' },
            title: p.title,
            body: p.body,
            quoteAuthor: p.quoteAuthor,
            voteStats: {
              up: p.upvoterIds.length,
              down: p.downvoterIds.length,
              save: p.saverIds.length,
            },
            createdAt: p.createdAt,
          };
        });
    },
    [allSimPosts, userId, simUsers, supabasePosts],
  );

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
      openDetailFeed(livePosts, post.id);
    },
    [openDetailFeed, livePosts],
  );

  const handleSeeMoreRecentPosts = useCallback(() => {
    router.push({ pathname: '/latest-posts', params: { userId: profileWithLiveFollowers.id } });
  }, [router, profileWithLiveFollowers.id]);

  const handleDetailAuthorPress = useCallback(
    (authorId: string) => {
      if (authorId === mockCurrentUser.id) {
        pushUnlessCurrent(pathname, '/my-profile');
      } else if (authorId === profile.id) {
        // Already viewing this user's profile — close the panel
        closeDetailFeed();
      } else {
        router.push({ pathname: '/profile/[id]', params: { id: authorId } });
      }
    },
    [closeDetailFeed, pathname, profile.id, router],
  );

  const handleDetailClanPress = useCallback(
    (clanId: string) => {
      const href = `/clan/${String(clanId).trim().toLowerCase()}`;
      pushUnlessCurrent(pathname, href);
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

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
      />

      <View style={[styles.otherProfileWrap, { height: contentHeight }]}>
        <ReflectionBackground clan={profile.clanId}>
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
              avatarUri={profile.avatarUri}
            />
            <UserIdentityHeader
              userId={profileWithLiveFollowers.id}
              username={profile.username}
              clanId={profile.clanId}
              rank={profile.rank}
              onShieldPress={
                profile.clanId
                  ? () =>
                      pushUnlessCurrent(
                        pathname,
                        `/clan/${String(profile.clanId).trim().toLowerCase()}`,
                      )
                  : undefined
              }
            />
            <UserInsigniaPhrase phrase={profile.insigniaPhrase} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
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
