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
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import { ClanPhilosopherSlot } from './ClanPhilosopherSlot';
import { UserResultCard } from '@evoconn/components/UserResultCard';
import type { CommunityPost } from '@evoconn/types';
import type { ClanMember } from '@evoconn/data/mockClanProfiles';

// ─── Constants ───────────────────────────────────────────────────────────────

const CARD_RATIO    = 0.55;
const MIN_CARD_W    = 200;
const ANIM_DURATION = 200;

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

export function ClanDisplay({ clanId, bottomPadding = 120 }: Props) {
  const router     = useRouter();
  const { width: screenW } = useWindowDimensions();
  const cardW      = Math.max(MIN_CARD_W, screenW * CARD_RATIO);
  const clan       = getClanProfileOrFallback(clanId);
  const config     = getClanConfig(clanId);
  const clanColor  = getClanColor(clanId);
  const ShieldSvg  = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);

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

  // ── Render: member row (Section 3) ────────────────────────────────────────
  const renderMember = useCallback(
    ({ item, index }: { item: ClanMember; index: number }) => (
      <UserResultCard
        id={item.id}
        username={item.username}
        clanId={item.clanId}
        rank={item.rank}
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
          {/* ── SECCIÓN 1 — Logo ──────────────────────────────────────── */}
          <View style={styles.logoSection}>
            <View style={styles.logoWrap}>
              <ShieldSvg width={180} height={180} />
            </View>
            <Text style={[styles.clanName, { color: clanColor }]}>
              {clan.name.replace('Clan ', '').toUpperCase()}
            </Text>
          </View>

          {/* ── SECCIÓN 2 — Frase del clan ────────────────────────────── */}
          <View style={styles.phraseSection}>
            <Text style={styles.clanPhrase}>{config.phrase}</Text>
          </View>

          {/* ── SECCIÓN 3 — Miembros destacados ──────────────────────── */}
          <View style={styles.panel}>
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

          {/* ── SECCIÓN 4 — Filósofos representativos ────────────────── */}
          <View style={styles.panelDark}>
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

          {/* ── SECCIÓN 5 — Descripción del clan ─────────────────────── */}
          <View style={styles.panel}>
            <Text style={[styles.panelTitle, { color: clanColor }]}>¿Cómo piensa este clan?</Text>
            <Text style={styles.descText}>{config.description}</Text>
          </View>

          {/* ── SECCIÓN 6 — Top publicaciones ────────────────────────── */}
          <View style={styles.postsSection}>
            <Text style={[styles.panelTitle, { marginHorizontal: 20, color: clanColor }]}>
              Top publicaciones del clan — últimas 24h
            </Text>
            {clan.recentPosts.length === 0 ? (
              <View style={[styles.emptyState, { marginHorizontal: 20 }]}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>Sin publicaciones recientes</Text>
              </View>
            ) : (
              <FlatList
                data={clan.recentPosts}
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
  scrollContent: { gap: 16 },

  // ── Section 1: Logo ──────────────────────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    gap: 12,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clanName: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // ── Section 2: Phrase ────────────────────────────────────────────────────
  phraseSection: {
    marginHorizontal: 20,
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 22,
  },
  clanPhrase: {
    color: '#ffffff',
    fontSize: 17,
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: 26,
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

  // ── Section 6: Posts ─────────────────────────────────────────────────────
  postsSection: {
    gap: 12,
  },
  postCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    minHeight: 160,
    justifyContent: 'space-between',
  },
  phraseWrap: {
    padding: 16,
    flex: 1,
  },
  quoteMarks: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 32,
    lineHeight: 28,
    fontWeight: '700',
  },
  phraseBody: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 6,
  },
  reflectionWrap: {
    padding: 16,
    flex: 1,
  },
  reflectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  reflectionBody: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  cardStat: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  cardType: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
