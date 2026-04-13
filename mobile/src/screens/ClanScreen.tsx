import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import { getClanProfileOrFallback } from '@evoconn/data/mockClanProfiles';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';
import { getClanColor } from '@evoconn/constants/clanColors';
import { evoconnColors } from '@evoconn/theme/colors';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import {
  CLAN_NAME_OFFSET_X,
  CLAN_NAME_OFFSET_Y,
  CLAN_NAME_FONT_SIZE,
  CLAN_SHIELD_OFFSET_X,
  CLAN_SHIELD_OFFSET_Y,
  CLAN_SHIELD_SCALE,
  CLAN_SHIELD_BASE_SIZE,
  CLAN_DESC_MARGIN_HORIZONTAL,
  CLAN_DESC_OFFSET_X,
  CLAN_DESC_OFFSET_Y,
  CLAN_JOIN_BUTTON_OFFSET_X,
  CLAN_JOIN_BUTTON_OFFSET_Y,
  CLAN_JOIN_BUTTON_SCALE,
  CLAN_STATS_OFFSET_X,
  CLAN_STATS_OFFSET_Y,
  CLAN_STATS_MARGIN_HORIZONTAL,
  CLAN_PHILOSOPHY_OFFSET_X,
  CLAN_PHILOSOPHY_OFFSET_Y,
  CLAN_PHILOSOPHY_WIDTH,
  CLAN_PHILOSOPHY_HEIGHT,
  CLAN_MEMBERS_OFFSET_X,
  CLAN_MEMBERS_OFFSET_Y,
  CLAN_MEMBERS_LABEL_FONT_SIZE,
  CLAN_POSTS_OFFSET_X,
  CLAN_POSTS_OFFSET_Y,
  CLAN_POSTS_LABEL_FONT_SIZE,
} from '@evoconn/constants/clanProfileLayout';
import type { CommunityPost } from '@evoconn/types';
import type { ClanMember } from '@evoconn/data/mockClanProfiles';

const ANIM_DURATION = 200;
const CARD_RATIO = 0.55;
const MIN_CARD_WIDTH = 200;
const RANK_LABELS: Record<string, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ClanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { thoughts } = useThoughts();

  const clanId = id ?? 'estoico';
  const clan = getClanProfileOrFallback(clanId);
  const ShieldSvg = getTopBarInsigniaByHouse(clanId);
  const clanColor = getClanColor(clanId);
  const cardW = Math.max(MIN_CARD_WIDTH, screenW * CARD_RATIO);

  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bottomTab] = useState<'siguiendo' | 'mas-votadas' | 'para-ti' | 'search'>('para-ti');
  const [joined, setJoined] = useState(false);

  // ─── Detail panel for post expansion ─────────────────────────────
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [detailFeed, setDetailFeed] = useState<{
    data: CommunityPost[];
    initialIndex: number;
  } | null>(null);
  const contentHeightRef = useRef(0);

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
    (post: CommunityPost) => openDetailFeed(clan.recentPosts, post.id),
    [openDetailFeed, clan.recentPosts],
  );

  const handleDetailAuthorPress = useCallback(
    (authorId: string) => {
      router.push({ pathname: '/profile/[id]', params: { id: authorId } });
    },
    [router],
  );

  const handleDetailClanPress = useCallback(
    (targetClanId: string) => {
      if (targetClanId === clanId) {
        closeDetailFeed();
      } else {
        router.push({ pathname: '/clan/[id]', params: { id: targetClanId } });
      }
    },
    [closeDetailFeed, clanId, router],
  );

  const handleBottomTabChange = useCallback(() => {
    if (detailFeed) { closeDetailFeed(); return; }
    router.replace('/(tabs)');
  }, [detailFeed, closeDetailFeed, router]);

  const handleMemberPress = useCallback(
    (member: ClanMember) => {
      router.push({ pathname: '/profile/[id]', params: { id: member.id } });
    },
    [router],
  );

  // ─── Render helpers ───────────────────────────────────────────────

  const renderPostCard = useCallback(
    ({ item }: { item: CommunityPost }) => {
      const isPhrase = item.type === 'phrase';
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePostPress(item)}
          style={[styles.postCard, { width: cardW }]}
        >
          {isPhrase ? (
            <View style={styles.phraseWrap}>
              <Text style={styles.quoteMarks}>"</Text>
              <Text style={styles.phraseBody} numberOfLines={5}>{item.body}</Text>
              {item.quoteAuthor ? (
                <Text style={styles.quoteAuthor}>— {item.quoteAuthor}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.reflectionWrap}>
              {item.title ? (
                <Text style={styles.reflectionTitle} numberOfLines={2}>{item.title}</Text>
              ) : null}
              <Text style={styles.reflectionBody} numberOfLines={4}>{item.body}</Text>
            </View>
          )}
          <View style={styles.cardFooter}>
            <Text style={styles.cardStat}>▲ {item.voteStats.up}</Text>
            <Text style={styles.cardType}>{isPhrase ? 'Frase' : 'Reflexión'}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [cardW, handlePostPress],
  );

  const renderMember = useCallback(
    ({ item }: { item: ClanMember }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleMemberPress(item)}
        style={styles.memberRow}
      >
        <View style={[styles.memberDot, { backgroundColor: getClanColor(item.clanId) }]} />
        <View style={styles.memberInfo}>
          <Text style={styles.memberUsername}>{item.username}</Text>
          <Text style={styles.memberRank}>{RANK_LABELS[item.rank] ?? item.rank}</Text>
        </View>
      </TouchableOpacity>
    ),
    [handleMemberPress],
  );

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => router.push('/my-profile')}
      />

      <View
        style={styles.contentWrap}
        onLayout={(e) => { contentHeightRef.current = e.nativeEvent.layout.height; }}
      >
        <ReflectionBackground clan={clanId}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight + 28 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Header ── */}
            <View style={styles.headerWrap}>
              {/* Clan name + join button on left */}
              <View style={styles.headerLeft}>
                <Text
                  style={[
                    styles.clanName,
                    {
                      fontSize: CLAN_NAME_FONT_SIZE,
                      color: clanColor,
                      transform: [
                        { translateX: CLAN_NAME_OFFSET_X },
                        { translateY: CLAN_NAME_OFFSET_Y },
                      ],
                    },
                  ]}
                  numberOfLines={2}
                >
                  {clan.name.toUpperCase()}
                </Text>

                {/* Join / Joined button */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setJoined((v) => !v)}
                  style={[
                    styles.joinButton,
                    joined && { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: clanColor },
                    {
                      borderColor: joined ? clanColor : '#FFFFFF',
                      transform: [
                        { translateX: CLAN_JOIN_BUTTON_OFFSET_X },
                        { translateY: CLAN_JOIN_BUTTON_OFFSET_Y },
                        { scale: CLAN_JOIN_BUTTON_SCALE },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.joinText, joined && { color: clanColor }]}>
                    {joined ? '✓ SIGUIENDO CLAN' : '+ UNIRSE AL CLAN'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Shield on right */}
              <View
                style={[
                  styles.shieldWrap,
                  {
                    width: CLAN_SHIELD_BASE_SIZE,
                    height: CLAN_SHIELD_BASE_SIZE,
                    transform: [
                      { translateX: CLAN_SHIELD_OFFSET_X },
                      { translateY: CLAN_SHIELD_OFFSET_Y },
                      { scale: CLAN_SHIELD_SCALE },
                    ],
                  },
                ]}
              >
                <ShieldSvg width={CLAN_SHIELD_BASE_SIZE} height={CLAN_SHIELD_BASE_SIZE} />
              </View>
            </View>

            {/* ── Description ── */}
            <View
              style={[
                styles.descBox,
                {
                  marginHorizontal: CLAN_DESC_MARGIN_HORIZONTAL,
                  transform: [
                    { translateX: CLAN_DESC_OFFSET_X },
                    { translateY: CLAN_DESC_OFFSET_Y },
                  ],
                },
              ]}
            >
              <Text style={styles.descText}>{clan.description}</Text>
            </View>

            {/* ── Stats row ── */}
            <View
              style={[
                styles.statsRow,
                {
                  marginHorizontal: CLAN_STATS_MARGIN_HORIZONTAL,
                  transform: [
                    { translateX: CLAN_STATS_OFFSET_X },
                    { translateY: CLAN_STATS_OFFSET_Y },
                  ],
                },
              ]}
            >
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatStat(clan.stats.members)}</Text>
                <Text style={styles.statLabel}>Miembros</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatStat(clan.stats.publications)}</Text>
                <Text style={styles.statLabel}>Publicaciones</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: clanColor }]}>{clan.stats.interactionRatio}%</Text>
                <Text style={styles.statLabel}>Interacción</Text>
              </View>
            </View>

            {/* ── Philosophy distribution ── */}
            <View
              style={[
                styles.philosophyWrap,
                {
                  transform: [
                    { translateX: CLAN_PHILOSOPHY_OFFSET_X },
                    { translateY: CLAN_PHILOSOPHY_OFFSET_Y },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.philosophyContainer,
                  CLAN_PHILOSOPHY_WIDTH !== undefined && { width: CLAN_PHILOSOPHY_WIDTH, alignSelf: 'center', marginHorizontal: 0 },
                  CLAN_PHILOSOPHY_HEIGHT !== undefined && { height: CLAN_PHILOSOPHY_HEIGHT },
                ]}
              >
                <Text style={styles.sectionLabel}>ADN FILOSÓFICO</Text>
                {clan.philosophyDistribution.map((entry) => (
                  <View key={entry.clanId} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>{entry.label}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${entry.pct}%`, backgroundColor: getClanColor(entry.clanId) }]} />
                    </View>
                    <Text style={styles.barPct}>{entry.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Top members ── */}
            <View
              style={[
                styles.sectionWrap,
                {
                  transform: [
                    { translateX: CLAN_MEMBERS_OFFSET_X },
                    { translateY: CLAN_MEMBERS_OFFSET_Y },
                  ],
                },
              ]}
            >
              <Text
                style={[styles.sectionTitle, { fontSize: CLAN_MEMBERS_LABEL_FONT_SIZE, marginHorizontal: 20 }]}
              >
                Miembros Destacados
              </Text>
              <FlatList
                data={clan.topMembers}
                keyExtractor={(m) => m.id}
                renderItem={renderMember}
                horizontal={false}
                scrollEnabled={false}
                contentContainerStyle={{ marginHorizontal: 20, gap: 6 }}
              />
            </View>

            {/* ── Latest posts ── */}
            <View
              style={[
                styles.sectionWrap,
                {
                  transform: [
                    { translateX: CLAN_POSTS_OFFSET_X },
                    { translateY: CLAN_POSTS_OFFSET_Y },
                  ],
                },
              ]}
            >
              <Text
                style={[styles.sectionTitle, { fontSize: CLAN_POSTS_LABEL_FONT_SIZE, marginHorizontal: 20 }]}
              >
                Últimas Publicaciones
              </Text>
              <FlatList
                data={clan.recentPosts}
                keyExtractor={(p) => p.id}
                renderItem={renderPostCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, gap: 12 }}
                snapToInterval={cardW + 12}
                decelerationRate="fast"
                scrollEnabled
              />
            </View>
          </ScrollView>
        </ReflectionBackground>

        {/* Expanded post viewer */}
        {detailFeed !== null && (
          <ProfileDetailPanel
            data={detailFeed.data}
            initialIndex={detailFeed.initialIndex}
            itemHeight={contentHeightRef.current}
            slideAnim={slideAnim}
            screenW={screenW}
            onClose={closeDetailFeed}
            onAuthorPress={handleDetailAuthorPress}
            onClanPress={handleDetailClanPress}
          />
        )}
      </View>

      <View
        style={[
          styles.bottomTabsWrap,
          {
            paddingBottom: insets.bottom + BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION,
            paddingHorizontal: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HORIZONTAL_PADDING,
            bottom: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BOTTOM_OFFSET,
            borderRadius: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BORDER_RADIUS,
          },
        ]}
      >
        <BottomCommunityTabs activeTab={bottomTab} onTabChange={handleBottomTabChange} />
      </View>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(sid) => {
          setSidebarOpen(false);
          router.push({ pathname: '/reflection', params: { thoughtId: sid } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  contentWrap: { flex: 1, overflow: 'hidden' },
  scrollContent: { paddingTop: 24, gap: 20 },

  // Header
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'relative',
    minHeight: 80,
  },
  headerLeft: {
    flex: 1,
    paddingRight: CLAN_SHIELD_BASE_SIZE + 20,
    gap: 10,
  },
  clanName: {
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  shieldWrap: {
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  // Join button
  joinButton: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },
  joinText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  // Description
  descBox: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  descText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  // Stats
  statsRow: {
    backgroundColor: '#000000',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.4,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Philosophy
  philosophyWrap: { alignSelf: 'stretch' },
  philosophyContainer: {
    marginHorizontal: 20,
    backgroundColor: '#000000',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    opacity: 0.7,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    width: 110,
  },
  barTrack: {
    flex: 1,
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barPct: {
    fontSize: 13,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
    color: '#FFFFFF',
  },

  // Sections
  sectionWrap: { gap: 10 },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
  },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#000000',
    borderRadius: 10,
    gap: 10,
  },
  memberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberInfo: { flex: 1 },
  memberUsername: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  memberRank: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 1,
  },

  // Post cards
  postCard: {
    backgroundColor: '#000000',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 170,
  },
  phraseWrap: { flex: 1, justifyContent: 'center' },
  quoteMarks: { color: 'rgba(255,255,255,0.25)', fontSize: 32, fontWeight: '800', lineHeight: 32, marginBottom: 2 },
  phraseBody: { color: '#FFFFFF', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  quoteAuthor: { color: '#FFFFFF', fontSize: 11, marginTop: 6, opacity: 0.7 },
  reflectionWrap: { flex: 1 },
  reflectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  reflectionBody: { color: '#FFFFFF', fontSize: 12, lineHeight: 18, opacity: 0.85 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  cardStat: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', opacity: 0.7 },
  cardType: { color: '#FFFFFF', fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', opacity: 0.5 },

  // Bottom
  bottomTabsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: evoconnColors.background,
    borderTopWidth: 1,
    borderTopColor: evoconnColors.background,
  },
});
