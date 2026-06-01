/**
 * ClanDisplay.tsx
 * ===============
 * Componente reutilizable para mostrar el display completo de un clan.
 * Recibe `clanId` como prop y renderiza las 6 secciones.
 *
 * Secciones:
 *  1. Fondo + logo grande
 *  2. Frase del clan
 *  3. Miembros destacados
 *  4. Filósofos representativos
 *  5. Descripción del clan
 *  6. Top publicaciones (horizontal scrollable)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { getClanColor } from '@evoconn/constants/clanColors';
import { getClanConfig } from '@evoconn/constants/clanConfig';
import { formatMythologyOriginPrefix } from '@evoconn/constants/clanDisplayCopy';
import { getClanProfileOrFallback } from '@evoconn/data/mockClanProfiles';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';
import { getClanEstandarte } from '@evoconn/utils/getClanEstandarte';
import {
  CLAN_DISPLAY_SHIELD_SIZE,
  CLAN_DISPLAY_SHIELD_OFFSET_X,
  CLAN_DISPLAY_SHIELD_OFFSET_Y,
  CLAN_DISPLAY_SHIELD_SCALE,
  CLAN_DISPLAY_SHIELD_MARGIN_BOTTOM,
  CLAN_DISPLAY_ESTANDARTE_H_MARGIN,
  CLAN_DISPLAY_ESTANDARTE_OFFSET_X,
  CLAN_DISPLAY_ESTANDARTE_OFFSET_Y,
  CLAN_DISPLAY_ESTANDARTE_SCALE,
  CLAN_DISPLAY_ESTANDARTE_MARGIN_TOP,
  CLAN_DISPLAY_ESTANDARTE_MARGIN_BOTTOM,
  CLAN_DISPLAY_LOGO_PADDING_TOP,
  CLAN_DISPLAY_SECTIONS_GAP,
  CLAN_DISPLAY_PHRASE_BORDER_RADIUS,
  CLAN_DISPLAY_PHRASE_RIM_ARM_X,
  CLAN_DISPLAY_PHRASE_RIM_ARM_Y,
  CLAN_DISPLAY_PHRASE_PADDING_V,
  CLAN_DISPLAY_PHRASE_PADDING_H,
  CLAN_DISPLAY_PHRASE_FONT_SIZE,
  CLAN_DISPLAY_PHRASE_LINE_HEIGHT,
  CLAN_DISPLAY_PHRASE_AUTHOR_MARGIN_TOP,
  CLAN_DISPLAY_PHRASE_AUTHOR_FONT_SIZE,
  CLAN_DISPLAY_PHRASE_AUTHOR_LINE_HEIGHT,
  CLAN_DISPLAY_POST_CARD_RATIO,
  CLAN_DISPLAY_POST_CARD_MIN_W,
} from '@evoconn/constants/clanDisplayLayout';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { ClanCardFeedRimOverlay } from '@evoconn/components/ClanCardFeedRimOverlay';
import {
  PanelStarField,
  PANEL_STAR_SURFACE_DEFAULT,
} from '@evoconn/components/animations/StarFieldBackground';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import { ClanPhilosopherSlot } from './ClanPhilosopherSlot';
import { UserResultCard } from '@evoconn/components/UserResultCard';
import { PersonalRecentPostCard } from '@evoconn/components/personalProfile/PersonalRecentPostCard';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { SIM_USERS } from '@evoconn/data/simulation/simulatedNetwork';
import { ClanRankingCard } from './ClanRankingCard';
import { useAuth } from '../../../mobile/lib/AuthContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { useEffectiveClanId } from '@evoconn/hooks/useEffectiveClanId';
import {
  fetchClanMembers,
  fetchClanMemberCountsByClan,
  type ClanMemberSummary,
} from '@evoconn/services/classificationSync';
import { computeAllClanRankings } from '@evoconn/utils/clanRanking';
import { getClanCompetitionPeriod } from '@evoconn/utils/clanCompetitionPeriod';
import { ALL_CLAN_IDS } from '@evoconn/services/clanClassifier';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import type { CommunityPost } from '@evoconn/types';
import type { ClanMember } from '@evoconn/data/mockClanProfiles';

// ─── Constants ───────────────────────────────────────────────────────────────

const ANIM_DURATION = 200;

/** Combina miembros reales (Supabase) con usuarios simulados del grafo demo. */
function mergeClanMemberCounts(
  dbCounts: Record<string, number>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const clan of ALL_CLAN_IDS) {
    counts[clan] = dbCounts[clan] ?? 0;
  }
  for (const user of SIM_USERS) {
    if (user.clanId && user.clanId in counts) {
      counts[user.clanId]++;
    }
  }
  return counts;
}

/** Genera un % de clan simulado a partir del rank para el display de miembros */
function mockClanPct(rank: string, index: number): string {
  const base = rank === 'filosofo' ? 94 : rank === 'maestro' ? 88 : 78;
  const offset = (index * 1.3) % 6;
  return (base - offset).toFixed(1);
}

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  clanId: string;
  bottomPadding?: number;
};

// ─── Component ───────────────────────────────────────────────────────────────

/** Publicaciones que se cargan por tanda al deslizar (en ambos sentidos). */
const POSTS_PAGE = 5;
/** Máximo de publicaciones montadas a la vez (ventana deslizante). */
const POSTS_WINDOW_MAX = 15;

export function ClanDisplay({ clanId, bottomPadding = 120 }: Props) {
  const router     = useRouter();
  const pathname   = usePathname();
  const { width: screenW } = useWindowDimensions();
  const cardW      = Math.max(CLAN_DISPLAY_POST_CARD_MIN_W, screenW * CLAN_DISPLAY_POST_CARD_RATIO);
  const clan       = getClanProfileOrFallback(clanId);
  const config     = getClanConfig(clanId);
  const clanColor  = getClanColor(clanId);
  const [phraseBoxDims, setPhraseBoxDims] = useState<{ width: number; height: number } | null>(null);
  const ShieldSvg      = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);
  const EstandarteSvg  = useMemo(() => getClanEstandarte(clanId), [clanId]);

  // ── Usuario autenticado real ──────────────────────────────────────────────
  const { profile: authProfile } = useAuth();
  const classification = useClassification();
  const realUserClanId = useEffectiveClanId();

  // ── Miembros destacados ──────────────────────────────────────────────────
  // Composición:
  //   1) El propio usuario autenticado si su clan local == este clan
  //   2) El resto de usuarios reales que tengan publicado este clan en
  //      Supabase (universalizado — ya no depende de la clasificación local
  //      del observador, que era la causa del bug "nadie aparece en mi clan")
  //   3) Como fallback / contenido base, los miembros simulados del perfil
  //      hardcodeado (filtrando u1–u9 que duplicarían las card de la sim)
  const SIM_IDS = useMemo(
    () => new Set(['u1','u2','u3','u4','u5','u6','u7','u8','u9']),
    [],
  );

  const [remoteMembers, setRemoteMembers] = useState<ClanMemberSummary[]>([]);
  const [dbMemberCounts, setDbMemberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const counts = await fetchClanMemberCountsByClan();
      if (!cancelled) setDbMemberCounts(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (clanId === 'indefinido') {
      setRemoteMembers([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const list = await fetchClanMembers(clanId, {
        excludeUserId:
          authProfile?.id && isRealUserId(authProfile.id) ? authProfile.id : null,
      });
      if (!cancelled) setRemoteMembers(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [clanId, authProfile?.id]);

  const topMembers = useMemo<(ClanMember & { _clanPct?: string; _avatarUri?: string | null })[]>(() => {
    const members: (ClanMember & { _clanPct?: string; _avatarUri?: string | null })[] = [];
    const seen = new Set<string>();

    if (authProfile && realUserClanId === clanId) {
      const pcts = classification.getPercentages();
      const dominantPct = pcts.find((p) => p.clanId === clanId)?.pct ?? 0;
      members.push({
        id: authProfile.id,
        username: authProfile.username,
        clanId: realUserClanId,
        rank: authProfile.rank,
        followersCount: 0,
        _clanPct: dominantPct.toFixed(1),
        _avatarUri: authProfile.avatar_url?.trim() || null,
      });
      seen.add(authProfile.id);
    }

    for (const m of remoteMembers) {
      if (seen.has(m.id)) continue;
      members.push({
        id: m.id,
        username: m.username,
        clanId: m.clanId,
        rank: m.rank,
        followersCount: 0,
        _clanPct: m.clanPct.toFixed(1),
        _avatarUri: m.avatarUri,
      });
      seen.add(m.id);
    }

    const filteredSim = clan.topMembers.filter(
      (m) => !SIM_IDS.has(m.id) && !seen.has(m.id),
    );
    members.push(...filteredSim);

    // Solo los 10 con mayor % de este clan, mostrados de mayor a menor.
    const pctOf = (m: { _clanPct?: string }) =>
      m._clanPct != null ? parseFloat(m._clanPct) || 0 : 0;
    return members
      .sort((a, b) => pctOf(b) - pctOf(a))
      .slice(0, 10);
  }, [
    authProfile,
    realUserClanId,
    clanId,
    clan.topMembers,
    classification,
    remoteMembers,
    SIM_IDS,
  ]);

  // ── Top posts en vivo — publicaciones del clan con ≥1 voto en las últimas 24h ──
  // Para 'indefinido', los autores sin clan asignado tienen clanId: null.
  const { posts: allPosts } = useFeedStore();
  const { postViewCounts, ensurePostViewCounts, recordPostView } = useSimulation();

  // Todas las publicaciones del clan, de más votadas a menos. Sin tope.
  const rankedPosts = useMemo(() => {
    const matchClan = clanId === 'indefinido'
      ? (authorClanId: string | null) => authorClanId == null
      : (authorClanId: string | null) => authorClanId === clanId;

    return allPosts
      .filter((p) => matchClan(p.author.clanId) && p.voteStats.up + p.voteStats.down >= 1)
      .sort((a, b) => b.voteStats.up - a.voteStats.up);
  }, [allPosts, clanId]);

  // Ventana deslizante: se cargan 5 en 5 (con spinner) en ambos sentidos y
  // como mucho POSTS_WINDOW_MAX (20) están montadas a la vez. Al avanzar se
  // sueltan las del principio; al retroceder se vuelven a cargar igual que a
  // la ida. maintainVisibleContentPosition evita saltos de scroll.
  const [postWindow, setPostWindow] = useState({ start: 0, end: POSTS_PAGE });
  const [postLoadDir, setPostLoadDir] = useState<null | 'forward' | 'backward'>(null);
  const postLoadingRef = useRef(false);
  const postWindowRef = useRef(postWindow);
  postWindowRef.current = postWindow;

  useEffect(() => {
    setPostWindow({ start: 0, end: POSTS_PAGE });
    setPostLoadDir(null);
    postLoadingRef.current = false;
  }, [clanId]);

  const livePosts = useMemo(
    () => rankedPosts.slice(postWindow.start, postWindow.end),
    [rankedPosts, postWindow],
  );

  const livePostIdsKey = useMemo(() => livePosts.map((p) => p.id).join(','), [livePosts]);
  useEffect(() => {
    if (livePostIdsKey) ensurePostViewCounts(livePostIdsKey.split(','));
  }, [livePostIdsKey, ensurePostViewCounts]);

  const loadPostsForward = useCallback(() => {
    if (postLoadingRef.current) return;
    if (postWindowRef.current.end >= rankedPosts.length) return;
    postLoadingRef.current = true;
    setPostLoadDir('forward');
    setTimeout(() => {
      setPostWindow((w) => {
        const end = Math.min(w.end + POSTS_PAGE, rankedPosts.length);
        const start = end - w.start > POSTS_WINDOW_MAX ? w.start + POSTS_PAGE : w.start;
        return { start, end };
      });
      setPostLoadDir(null);
      postLoadingRef.current = false;
    }, 350);
  }, [rankedPosts.length]);

  const loadPostsBackward = useCallback(() => {
    if (postLoadingRef.current) return;
    if (postWindowRef.current.start <= 0) return;
    postLoadingRef.current = true;
    setPostLoadDir('backward');
    setTimeout(() => {
      setPostWindow((w) => {
        const start = Math.max(w.start - POSTS_PAGE, 0);
        const end = w.end - start > POSTS_WINDOW_MAX ? w.end - POSTS_PAGE : w.end;
        return { start, end };
      });
      setPostLoadDir(null);
      postLoadingRef.current = false;
    }, 350);
  }, []);

  // Dispara la carga por la izquierda en cuanto la primera tarjeta toca el
  // borde. Se engancha a onScroll + fin de arrastre + fin de inercia para que
  // baste con deslizar hasta el borde (sin vaivén).
  const handlePostsScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (e.nativeEvent.contentOffset.x <= cardW * 0.5) loadPostsBackward();
    },
    [cardW, loadPostsBackward],
  );

  // ── Ranking del clan ──────────────────────────────────────────────────────
  const memberCounts = useMemo(
    () => mergeClanMemberCounts(dbMemberCounts),
    [dbMemberCounts],
  );
  const competitionPeriod = useMemo(() => getClanCompetitionPeriod(), []);
  const allRankings = useMemo(
    () => computeAllClanRankings(allPosts, memberCounts),
    [allPosts, memberCounts],
  );
  const clanRanking = allRankings[clanId] ?? {
    rank: 1,
    points: 0,
    daysLeft: competitionPeriod.daysLeft,
  };

  // ── Detail panel state ────────────────────────────────────────────────────
  const slideAnim        = useRef(new Animated.Value(0)).current;
  const contentHeightRef = useRef(0);
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
    }).start(({ finished }) => { if (finished) setDetailFeed(null); });
  }, [slideAnim]);

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      recordPostView(post.id);
      openDetailFeed(livePosts, post.id);
    },
    [openDetailFeed, livePosts, recordPostView],
  );

  const handleDetailAuthorPress = useCallback(
    (authorId: string) => {
      navigateUnlessCurrent(pathname, `/profile/${authorId}`);
    },
    [pathname],
  );

  const handleDetailClanPress = useCallback(
    (targetClanId: string) => {
      if (targetClanId === clanId) { closeDetailFeed(); }
      else { navigateUnlessCurrent(pathname, `/clan/${targetClanId}`); }
    },
    [closeDetailFeed, clanId, pathname],
  );

  const handleMemberPress = useCallback(
    (member: ClanMember) => {
      navigateUnlessCurrent(pathname, `/profile/${member.id}`);
    },
    [pathname],
  );

  // ── Render: post card (Section 6) ─────────────────────────────────────────
  const renderPostCard = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PersonalRecentPostCard
        post={item}
        cardWidth={cardW}
        onPress={handlePostPress}
        viewCount={postViewCounts[item.id] ?? 0}
      />
    ),
    [cardW, handlePostPress, postViewCounts],
  );

  // ── Render: member row (Section 3) ────────────────────────────────────────
  const renderMember = useCallback(
    ({ item, index }: { item: ClanMember; index: number }) => {
      const extItem = item as ClanMember & { _clanPct?: string; _avatarUri?: string | null };
      const pct = extItem._clanPct ?? mockClanPct(item.rank, index);
      return (
        <UserResultCard
          id={item.id}
          username={item.username}
          clanId={item.clanId}
          rank={item.rank}
          followersCount={item.followersCount ?? 0}
          clanPct={pct}
          avatarUri={extItem._avatarUri}
          avatarVariant="clan"
          onPress={() => handleMemberPress(item)}
        />
      );
    },
    [handleMemberPress],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View
      style={styles.root}
      onLayout={(e) => { contentHeightRef.current = e.nativeEvent.layout.height; }}
    >
      <ReflectionBackground clan={clanId}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── SECCIÓN 1 — Logo + Estandarte ────────────────────────── */}
          <View style={styles.logoSection}>
            <View
              style={[
                styles.logoWrap,
                { marginBottom: CLAN_DISPLAY_SHIELD_MARGIN_BOTTOM },
                {
                  transform: [
                    { translateX: CLAN_DISPLAY_SHIELD_OFFSET_X },
                    { translateY: CLAN_DISPLAY_SHIELD_OFFSET_Y },
                    { scale: CLAN_DISPLAY_SHIELD_SCALE },
                  ],
                },
              ]}
            >
              <ShieldSvg
                width={CLAN_DISPLAY_SHIELD_SIZE}
                height={CLAN_DISPLAY_SHIELD_SIZE}
              />
            </View>

            {/* Estandarte del clan */}
            <View
              style={[
                styles.estandarteWrap,
                {
                  marginTop: CLAN_DISPLAY_ESTANDARTE_MARGIN_TOP,
                  marginBottom: CLAN_DISPLAY_ESTANDARTE_MARGIN_BOTTOM,
                },
                {
                  transform: [
                    { translateX: CLAN_DISPLAY_ESTANDARTE_OFFSET_X },
                    { translateY: CLAN_DISPLAY_ESTANDARTE_OFFSET_Y },
                    { scale: CLAN_DISPLAY_ESTANDARTE_SCALE },
                  ],
                },
              ]}
            >
              <EstandarteSvg
                width={screenW - CLAN_DISPLAY_ESTANDARTE_H_MARGIN}
                height={screenW - CLAN_DISPLAY_ESTANDARTE_H_MARGIN}
              />
            </View>
          </View>

          {/* ── SECCIÓN 2 — Frase del clan (fondo + rebordes como Siguiendo) ─ */}
          <View
            style={styles.phraseSection}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setPhraseBoxDims((prev) =>
                prev?.width === width && prev?.height === height ? prev : { width, height },
              );
            }}
          >
            <View style={styles.phraseStarField} pointerEvents="none">
              <PanelStarField surfaceColor={PANEL_STAR_SURFACE_DEFAULT} />
            </View>
            <View style={styles.phraseContent}>
              <Text style={styles.clanPhrase}>{config.phrase}</Text>
              {config.phraseAuthor ? (
                <Text
                  style={[
                    styles.clanPhraseAuthor,
                    {
                      color: clanColor,
                      marginTop: CLAN_DISPLAY_PHRASE_AUTHOR_MARGIN_TOP,
                      fontSize: CLAN_DISPLAY_PHRASE_AUTHOR_FONT_SIZE,
                      lineHeight: CLAN_DISPLAY_PHRASE_AUTHOR_LINE_HEIGHT,
                    },
                  ]}
                >
                  {'\u2014 '}
                  {config.phraseAuthor}
                </Text>
              ) : null}
            </View>
            {phraseBoxDims ? (
              <ClanCardFeedRimOverlay
                width={phraseBoxDims.width}
                height={phraseBoxDims.height}
                borderRadius={CLAN_DISPLAY_PHRASE_BORDER_RADIUS}
                clanColor={clanColor}
                rimArmX={CLAN_DISPLAY_PHRASE_RIM_ARM_X}
                rimArmY={CLAN_DISPLAY_PHRASE_RIM_ARM_Y}
              />
            ) : null}
          </View>

          {/* ── SECCIONES 2b, 3, 4 — Solo para clanes reales (no "sin clan") ── */}
          {clanId !== 'indefinido' && (
            <>
              {/* Ranking del clan */}
              <ClanRankingCard
                clanId={clanId}
                rank={clanRanking.rank}
                points={clanRanking.points}
                daysLeft={clanRanking.daysLeft}
                competitionActive={competitionPeriod.isCompetitionActive}
                membersCount={memberCounts[clanId] ?? 0}
              />

              {/* Miembros destacados */}
              <View style={[styles.panel, { borderWidth: 1, borderColor: `${clanColor}22` }]}>
                <Text style={[styles.panelTitle, { color: clanColor }]}>Miembros destacados</Text>
                {topMembers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🏛</Text>
                    <Text style={styles.emptyText}>Aún no hay miembros destacados</Text>
                    <Text style={styles.emptySubtext}>Sé el primero en llegar al top del clan</Text>
                  </View>
                ) : (
                  <FlatList
                    data={topMembers}
                    keyExtractor={(m) => m.id}
                    renderItem={renderMember}
                    scrollEnabled={false}
                    contentContainerStyle={styles.memberList}
                  />
                )}
              </View>

              {/* Referentes filosóficos */}
              <View style={[styles.panelDark, { borderWidth: 1, borderColor: `${clanColor}22` }]}>
                <Text style={[styles.panelTitle, { color: clanColor }]}>Referentes filosóficos</Text>
                <View style={styles.philosophersRow}>
                  {config.philosophers.map((philosopher, idx) => (
                    <ClanPhilosopherSlot
                      key={philosopher.name + idx}
                      philosopher={philosopher}
                      accentColor={clanColor}
                    />
                  ))}
                </View>
              </View>
            </>
          )}

          {/* ── SECCIÓN 5 — Descripción del clan ─────────────────────── */}
          <View style={[styles.panel, { borderWidth: 1, borderColor: `${clanColor}22` }]}>
            <Text style={[styles.panelTitle, { color: clanColor }]}>¿Cómo piensa este clan?</Text>
            <View style={styles.bulletList}>
              {config.descriptionPoints.map((point, idx) => (
                <View key={`desc-${idx}`} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: clanColor }]}>•</Text>
                  <Text style={styles.descText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>

          {config.mythology != null && (
            <View style={[styles.panel, { borderWidth: 1, borderColor: `${clanColor}22` }]}>
              <Text style={[styles.panelTitle, { color: clanColor }]}>
                Símbolo mitológico del clan
              </Text>
              <Text style={styles.descText}>
                {formatMythologyOriginPrefix(config.mythology.mythologyOrigin)}{' '}
                {config.mythology.description}
              </Text>
            </View>
          )}

          {/* ── SECCIÓN 6 — Top publicaciones ────────────────────────── */}
          <View style={styles.postsSection}>
            {livePosts.length === 0 ? (
              <View style={[styles.emptyState, { marginHorizontal: 20 }]}>
                <Text style={styles.emptyText}>Sin publicaciones recientes</Text>
              </View>
            ) : (
              <View>
                <FlatList
                  data={livePosts}
                  keyExtractor={(p) => p.id}
                  renderItem={renderPostCard}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                  snapToInterval={cardW + 12}
                  decelerationRate="fast"
                  scrollEnabled
                  onScroll={handlePostsScroll}
                  onScrollEndDrag={handlePostsScroll}
                  onMomentumScrollEnd={handlePostsScroll}
                  scrollEventThrottle={16}
                  onEndReached={loadPostsForward}
                  onEndReachedThreshold={0.5}
                  initialNumToRender={POSTS_PAGE}
                  maxToRenderPerBatch={POSTS_PAGE}
                  windowSize={5}
                  removeClippedSubviews
                  maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                  ListFooterComponent={
                    postLoadDir === 'forward' ? (
                      <View style={[styles.postsLoader, { width: cardW * 0.5 }]}>
                        <ActivityIndicator size="small" color={clanColor} />
                      </View>
                    ) : null
                  }
                />
                {postLoadDir === 'backward' ? (
                  <View style={styles.postsLoaderLeft} pointerEvents="none">
                    <ActivityIndicator size="small" color={clanColor} />
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>
      </ReflectionBackground>

      {/* Expanded post viewer overlay */}
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
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  scroll: { flex: 1 },
  scrollContent: { gap: CLAN_DISPLAY_SECTIONS_GAP },

  // ── Section 1: Logo ──────────────────────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    paddingTop: CLAN_DISPLAY_LOGO_PADDING_TOP,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  estandarteWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },


  // ── Section 2: Phrase ────────────────────────────────────────────────────
  phraseSection: {
    marginHorizontal: 20,
    borderRadius: CLAN_DISPLAY_PHRASE_BORDER_RADIUS,
    paddingVertical: CLAN_DISPLAY_PHRASE_PADDING_V,
    paddingHorizontal: CLAN_DISPLAY_PHRASE_PADDING_H,
    overflow: 'hidden',
  },
  phraseStarField: {
    ...StyleSheet.absoluteFillObject,
  },
  phraseContent: {
    zIndex: 1,
    alignItems: 'center',
  },
  clanPhrase: {
    color: '#ffffff',
    fontSize: CLAN_DISPLAY_PHRASE_FONT_SIZE,
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: CLAN_DISPLAY_PHRASE_LINE_HEIGHT,
    textAlign: 'center',
  },
  clanPhraseAuthor: {
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.15,
    opacity: 0.88,
  },

  // ── Shared panel styles ──────────────────────────────────────────────────
  panel: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  panelDark: {
    marginHorizontal: 20,
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── Section 3: Members ───────────────────────────────────────────────────
  memberList: {
    gap: 4,
  },

  // ── Section 4: Philosophers ──────────────────────────────────────────────
  philosophersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },

  // ── Section 5: Description ───────────────────────────────────────────────
  bulletList: {
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 0,
  },
  descText: {
    flex: 1,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 22,
  },

  // ── Section 6: Posts — tarjeta delegada a PersonalRecentPostCard ─────────
  postsSection: {
    gap: 12,
  },
  postsLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  postsLoaderLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty states ─────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },

});
