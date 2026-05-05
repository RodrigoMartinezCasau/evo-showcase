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
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { getClanColor } from '@evoconn/constants/clanColors';
import { getClanConfig } from '@evoconn/constants/clanConfig';
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
  CLAN_DISPLAY_PHRASE_PADDING_V,
  CLAN_DISPLAY_PHRASE_PADDING_H,
  CLAN_DISPLAY_PHRASE_FONT_SIZE,
  CLAN_DISPLAY_PHRASE_LINE_HEIGHT,
  CLAN_DISPLAY_POST_CARD_RATIO,
  CLAN_DISPLAY_POST_CARD_MIN_W,
} from '@evoconn/constants/clanDisplayLayout';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import { ClanPhilosopherSlot } from './ClanPhilosopherSlot';
import { UserResultCard } from '@evoconn/components/UserResultCard';
import { PersonalRecentPostCard } from '@evoconn/components/personalProfile/PersonalRecentPostCard';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { SIM_USERS } from '@evoconn/data/simulation/simulatedNetwork';
import { ClanRankingCard } from './ClanRankingCard';
import type { CommunityPost } from '@evoconn/types';
import type { ClanMember } from '@evoconn/data/mockClanProfiles';

// ─── Constants ───────────────────────────────────────────────────────────────

const ANIM_DURATION = 200;

/** Los 8 clanes reales (sin contar 'indefinido'). */
const REAL_CLANS = [
  'nihilista', 'cientista', 'estoico', 'existencialista',
  'trascendentalista', 'humanista', 'realista', 'racionalista',
] as const;

/** Duración del período de ranking: 30 días en ms. */
const RANKING_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/** Fecha ancla para alinear los períodos de 30 días (1 enero 2025). */
const RANKING_EPOCH = new Date('2025-01-01T00:00:00Z').getTime();

/** Calcula el inicio del período de 30 días activo. */
function getPeriodStart(): number {
  const elapsed = Date.now() - RANKING_EPOCH;
  const periods = Math.floor(elapsed / RANKING_PERIOD_MS);
  return RANKING_EPOCH + periods * RANKING_PERIOD_MS;
}

/** Días restantes en el período activo. */
function getDaysLeft(): number {
  const periodStart = getPeriodStart();
  const msLeft = RANKING_PERIOD_MS - (Date.now() - periodStart);
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
}

type ClanRankInfo = { rank: number; points: number; daysLeft: number };

/** Calcula puntos y ranking para todos los clanes dado un array de posts. */
function computeAllClanRankings(posts: CommunityPost[]): Record<string, ClanRankInfo> {
  const periodStart = getPeriodStart();
  const daysLeft = getDaysLeft();

  // Filtrar posts del período actual
  const periodPosts = posts.filter(
    (p) => new Date(p.createdAt).getTime() >= periodStart,
  );

  // Acumular posts por clan
  const clanPostCounts: Record<string, number> = {};
  for (const clan of REAL_CLANS) { clanPostCounts[clan] = 0; }

  for (const post of periodPosts) {
    const authorClanId = post.author.clanId;
    if (authorClanId && authorClanId in clanPostCounts) {
      clanPostCounts[authorClanId]++;
    }
  }

  // Contar miembros de cada clan desde SIM_USERS (mínimo 1 para evitar /0)
  const clanMemberCounts: Record<string, number> = {};
  for (const clan of REAL_CLANS) { clanMemberCounts[clan] = 0; }
  for (const user of SIM_USERS) {
    if (user.clanId && user.clanId in clanMemberCounts) {
      clanMemberCounts[user.clanId]++;
    }
  }

  // Calcular puntos = posts del período / max(miembros, 1)
  const clanPoints = REAL_CLANS.map((clan) => ({
    clanId: clan,
    points: clanPostCounts[clan] / Math.max(clanMemberCounts[clan], 1),
  })).sort((a, b) => b.points - a.points || REAL_CLANS.indexOf(a.clanId as typeof REAL_CLANS[number]) - REAL_CLANS.indexOf(b.clanId as typeof REAL_CLANS[number]));

  // Asignar rangos (empates comparten rango)
  const result: Record<string, ClanRankInfo> = {};
  let currentRank = 1;
  for (let i = 0; i < clanPoints.length; i++) {
    if (i > 0 && clanPoints[i].points === clanPoints[i - 1].points) {
      result[clanPoints[i].clanId] = { rank: result[clanPoints[i - 1].clanId].rank, points: clanPoints[i].points, daysLeft };
    } else {
      result[clanPoints[i].clanId] = { rank: currentRank, points: clanPoints[i].points, daysLeft };
    }
    currentRank++;
  }

  return result;
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

const WINDOW_24H = 24 * 60 * 60 * 1000;

export function ClanDisplay({ clanId, bottomPadding = 120 }: Props) {
  const router     = useRouter();
  const { width: screenW } = useWindowDimensions();
  const cardW      = Math.max(CLAN_DISPLAY_POST_CARD_MIN_W, screenW * CLAN_DISPLAY_POST_CARD_RATIO);
  const clan       = getClanProfileOrFallback(clanId);
  const config     = getClanConfig(clanId);
  const clanColor  = getClanColor(clanId);
  const ShieldSvg      = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);
  const EstandarteSvg  = useMemo(() => getClanEstandarte(clanId), [clanId]);

  // ── Top posts en vivo — publicaciones del clan con ≥1 voto en las últimas 24h ──
  // Para 'indefinido', los autores sin clan asignado tienen clanId: null.
  const { posts: allPosts } = useFeedStore();
  const livePosts = useMemo(() => {
    const since = Date.now() - WINDOW_24H;
    const matchClan = clanId === 'indefinido'
      ? (authorClanId: string | null) => authorClanId == null
      : (authorClanId: string | null) => authorClanId === clanId;

    const inWindow = allPosts.filter((p) =>
      matchClan(p.author.clanId) &&
      new Date(p.createdAt).getTime() >= since &&
      p.voteStats.up + p.voteStats.down >= 1,
    );

    // Si no hay posts en las últimas 24h, muestra los más votados sin límite de tiempo.
    const source = inWindow.length > 0
      ? inWindow
      : allPosts.filter((p) =>
          matchClan(p.author.clanId) && p.voteStats.up + p.voteStats.down >= 1,
        );

    return source.sort((a, b) => b.voteStats.up - a.voteStats.up);
  }, [allPosts, clanId]);

  // ── Ranking del clan ──────────────────────────────────────────────────────
  const allRankings = useMemo(() => computeAllClanRankings(allPosts), [allPosts]);
  const clanRanking: ClanRankInfo = allRankings[clanId] ?? { rank: 1, points: 0, daysLeft: getDaysLeft() };

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
    (post: CommunityPost) => openDetailFeed(livePosts, post.id),
    [openDetailFeed, livePosts],
  );

  const handleDetailAuthorPress = useCallback(
    (authorId: string) => {
      router.push({ pathname: '/profile/[id]', params: { id: authorId } });
    },
    [router],
  );

  const handleDetailClanPress = useCallback(
    (targetClanId: string) => {
      if (targetClanId === clanId) { closeDetailFeed(); }
      else { router.push({ pathname: '/clan/[id]', params: { id: targetClanId } }); }
    },
    [closeDetailFeed, clanId, router],
  );

  const handleMemberPress = useCallback(
    (member: ClanMember) => {
      router.push({ pathname: '/profile/[id]', params: { id: member.id } });
    },
    [router],
  );

  // ── Render: post card (Section 6) ─────────────────────────────────────────
  const renderPostCard = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PersonalRecentPostCard
        post={item}
        cardWidth={cardW}
        onPress={handlePostPress}
      />
    ),
    [cardW, handlePostPress],
  );

  // ── Render: member row (Section 3) ────────────────────────────────────────
  const renderMember = useCallback(
    ({ item, index }: { item: ClanMember; index: number }) => (
      <UserResultCard
        id={item.id}
        username={item.username}
        clanId={item.clanId}
        rank={item.rank}
        followersCount={item.followersCount ?? 0}
        clanPct={mockClanPct(item.rank, index)}
        onPress={() => handleMemberPress(item)}
      />
    ),
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

          {/* ── SECCIÓN 2 — Frase del clan ────────────────────────────── */}
          <View style={styles.phraseSection}>
            <Text style={styles.clanPhrase}>{config.phrase}</Text>
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
              />

              {/* Miembros destacados */}
              <View style={[styles.panel, { borderWidth: 1, borderColor: `${clanColor}22` }]}>
                <Text style={[styles.panelTitle, { color: clanColor }]}>Miembros destacados</Text>
                {clan.topMembers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🏛</Text>
                    <Text style={styles.emptyText}>Aún no hay miembros destacados</Text>
                    <Text style={styles.emptySubtext}>Sé el primero en llegar al top del clan</Text>
                  </View>
                ) : (
                  <FlatList
                    data={clan.topMembers}
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
            <Text style={styles.descText}>{config.description}</Text>
          </View>

          {/* ── SECCIÓN 6 — Top publicaciones ────────────────────────── */}
          <View style={styles.postsSection}>
            {livePosts.length === 0 ? (
              <View style={[styles.emptyState, { marginHorizontal: 20 }]}>
                <Text style={styles.emptyText}>Sin publicaciones recientes</Text>
              </View>
            ) : (
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
              />
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
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: CLAN_DISPLAY_PHRASE_PADDING_V,
    paddingHorizontal: CLAN_DISPLAY_PHRASE_PADDING_H,
  },
  clanPhrase: {
    color: '#ffffff',
    fontSize: CLAN_DISPLAY_PHRASE_FONT_SIZE,
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: CLAN_DISPLAY_PHRASE_LINE_HEIGHT,
    textAlign: 'center',
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
  descText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 22,
  },

  // ── Section 6: Posts — tarjeta delegada a PersonalRecentPostCard ─────────
  postsSection: {
    gap: 12,
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
