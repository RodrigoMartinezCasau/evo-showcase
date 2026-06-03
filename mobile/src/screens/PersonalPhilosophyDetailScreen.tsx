/**
 * PersonalPhilosophyDetailScreen
 *
 * Detailed philosophical identity display for the CURRENT USER.
 * Opened ONLY from PersonalProfileScreen when tapping the philosophy panel.
 * NOT available from OtherUserProfileScreen.
 *
 * Preserves the standard app shell:
 *   - Fixed top bar (AppTopBar)
 *   - Fixed bottom bar (BottomCommunityTabs)
 *   - Central content area scrolls
 *
 * AI blocks each cost 1 use per generation/reload.
 * Results are persisted on the backend and restored on reopen.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { useAuth } from '../../mobile/lib/AuthContext';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { usePublishedPercentages } from '@evoconn/hooks/usePublishedPercentages';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { usePreviewMode } from '@evoconn/debug/PreviewModeContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { useDeferredRender } from '@evoconn/hooks/useDeferredRender';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';

import { AiSummaryCard } from '@evoconn/components/philosophyProfile/AiSummaryCard';
import { ClanBadgesRecordCard } from '@evoconn/components/philosophyProfile/ClanBadgesRecordCard';
import { DetailedRankCard } from '@evoconn/components/philosophyProfile/DetailedRankCard';
import { ClanPercentagesTable } from '@evoconn/components/philosophyProfile/ClanPercentagesTable';
import { SimilarPhilosophersCard } from '@evoconn/components/philosophyProfile/SimilarPhilosophersCard';
import { BookRecommendationsCard } from '@evoconn/components/philosophyProfile/BookRecommendationsCard';
import type { AiBlockState } from '@evoconn/components/philosophyProfile/AiBlockCard';
import type { Rank } from '@evoconn/types';
import { useDailyUsesGate } from '@evoconn/hooks/useDailyUsesGate';

import {
  fetchPhilosophyProfile,
  generateSummary,
  generatePhilosophers,
  type PhilosopherEntry,
  type PhilosophyContext,
} from '@evoconn/services/philosophyProfileApi';
import { recordUsesLog } from '@evoconn/services/streakApi';
import {
  loadPhilosophyBooks,
  savePhilosophyBooks,
} from '@evoconn/services/philosophyBooksStorage';
import { getBookRecommendations } from '@evoconn/logic/books/getBookRecommendations';
import type { BookRecord } from '@evoconn/data/books/bookDatabase';
import { useDebugStats } from '../debug/DebugStatsContext';
import { requestNoUsesAnimation } from '@evoconn/components/animations/AppAnimationLayer';
import { mergeClanRankHistories } from '@evoconn/services/classificationStorage';
import type { ClanScoreId } from '@evoconn/services/clanClassifier';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNoUsesError(msg: string): boolean {
  return msg.toLowerCase().includes('sin usos') || msg.toLowerCase().includes('quota') || msg.includes('429');
}

function isPlaceholderUsername(username: string | null | undefined): boolean {
  const normalized = (username ?? '').trim().replace(/^@/, '').toLowerCase();
  return !normalized || normalized === 'invitado' || normalized === 'guest';
}

function buildContext(
  profile: ReturnType<typeof getPersonalProfile>,
  dominantClan: string,
  authUsername?: string | null,
): PhilosophyContext {
  const rawUsername = (authUsername?.trim() || profile.username?.trim() || '');
  return {
    // El resumen habla en segunda persona; no enviamos placeholders tipo @invitado.
    username: isPlaceholderUsername(rawUsername) ? '' : rawUsername,
    clan_percentages: profile.philosophyPercentages,
    rank: profile.rank,
    total_reflections: profile.totalReflections,
    total_quotes: profile.totalQuotes,
    sample_reflections: profile.recentPosts
      .filter((p) => p.type === 'reflection')
      .map((p) => p.title ?? p.body ?? '')
      .filter(Boolean),
    sample_phrases: profile.recentPosts
      .filter((p) => p.type === 'phrase')
      .map((p) => p.body ?? '')
      .filter(Boolean),
    dominant_clan: dominantClan,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PersonalPhilosophyDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const { isPreviewActive, previewBadgeHistory, cyclePreviewBadgeRank } = usePreviewMode();
  const { thoughts } = useThoughts();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const ready = useDeferredRender();
  const { profile: authProfile } = useAuth();

  const baseProfile = getPersonalProfile();
  // Use real philosophical-classification data instead of seed mock values.
  const classification = useClassification();
  // Diferidos tras `ready`: estos getters recorren el estado de clasificación y,
  // en el primer render, bloquean el hilo JS retrasando el pintado del spinner.
  // Mientras `!ready` el cuerpo no se muestra, así que devolvemos valores neutros.
  const localPercentages = ready ? classification.getPercentages(baseProfile.id) : [];
  const localVisibleClanId = ready ? classification.getVisibleClanId(baseProfile.id) : null;
  const localDisplayRank = ready ? classification.getDisplayRank(baseProfile.id) : 'aprendiz';
  // Fallback robusto: si el store local está vacío (build nuevo / storage
  // limpio), usamos el `clan_percentages` / `clan_id` / `rank` publicados en
  // Supabase.
  const {
    percentages: realPercentages,
    clanId: publishedClanId,
    rank: publishedRank,
  } = usePublishedPercentages(
    authProfile?.id ?? baseProfile.id,
    localPercentages,
    localVisibleClanId,
    localDisplayRank,
  );
  const localRankHistory = ready
    ? classification.getClanRankHistory(authProfile?.id ?? baseProfile.id)
    : {};
  // Medallas permanentes por clan visitado. Si el historial local está incompleto
  // (storage borrado, heal previo, build antiguo), fusionamos al menos la medalla
  // del clan publicado actual — sin sustituir otras entradas que vengan del merge
  // con Supabase en ClassificationContext.
  const clanRankHistory = isPreviewActive
    ? previewBadgeHistory
    : mergeClanRankHistories(
        localRankHistory,
        publishedClanId
          ? ({ [publishedClanId as ClanScoreId]: publishedRank } as Partial<
              Record<ClanScoreId, Rank>
            >)
          : {},
      );
  const profile = {
    ...baseProfile,
    philosophyPercentages: realPercentages,
    rank: ready ? classification.getDisplayRank(baseProfile.id) : 'aprendiz',
  };
  /** Misma regla que racha/usos: Supabase cuando hay sesión, si no el perfil activo. */
  const apiUserId = authProfile?.id ?? profile.id;
  const { hasAiUses, blockIfNoUses } = useDailyUsesGate();
  const { decrementUses, remainingUses } = useDebugStats();
  const remainingUsesRef = useRef(remainingUses);
  remainingUsesRef.current = remainingUses;
  const clanId = activeClan;

  /** Same quota as enviar reflexión/frase: 1 uso local + log remoto por generación. */
  const consumeAiUse = useCallback(() => {
    const justEmptied = remainingUsesRef.current === 1;
    decrementUses();
    if (justEmptied) requestNoUsesAnimation();
    void recordUsesLog(apiUserId).catch(() => {});
  }, [apiUserId, decrementUses]);

  // Dominant clan (highest pct)
  const sorted = [...profile.philosophyPercentages].sort((a, b) => b.pct - a.pct);
  const dominant = sorted[0] ?? { label: '', pct: 0 };
  const ctx = buildContext(profile, dominant.label, authProfile?.username);

  // ─── AI block state ──────────────────────────────────────────────────────
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<AiBlockState>('idle');
  const [summaryError, setSummaryError] = useState<string | undefined>();

  const [philosophers, setPhilosophers] = useState<PhilosopherEntry[] | null>(null);
  const [philosophersState, setPhilosophersState] = useState<AiBlockState>('idle');
  const [philosophersError, setPhilosophersError] = useState<string | undefined>();

  // ── Book recommendations: local engine, no backend call ────────────
  const [books, setBooks] = useState<BookRecord[] | null>(null);
  const [booksExhausted, setBooksExhausted] = useState(false);
  const [booksState, setBooksState] = useState<AiBlockState>('idle');
  /** Ids of all books that have been shown in this session — prevents repeats. */
  const [shownBookIds, setShownBookIds] = useState<string[]>([]);

  // ─── Load stored results on mount ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [data, localBooks] = await Promise.all([
          fetchPhilosophyProfile(apiUserId),
          loadPhilosophyBooks(apiUserId),
        ]);
        if (data.summary) {
          setSummaryText(data.summary);
          setSummaryState('success');
        }
        if (data.philosophers) {
          setPhilosophers(data.philosophers);
          setPhilosophersState('success');
        }
        if (localBooks) {
          setShownBookIds(localBooks.shownBookIds);
          setBooksExhausted(localBooks.exhausted);
          if (localBooks.exhausted || localBooks.books.length > 0) {
            setBooks(localBooks.books.length > 0 ? localBooks.books : null);
            setBooksState('success');
          }
        }
      } catch {
        // Backend unreachable — show empty blocks, user can still try to generate
        const localBooks = await loadPhilosophyBooks(apiUserId).catch(() => null);
        if (localBooks) {
          setShownBookIds(localBooks.shownBookIds);
          setBooksExhausted(localBooks.exhausted);
          if (localBooks.exhausted || localBooks.books.length > 0) {
            setBooks(localBooks.books.length > 0 ? localBooks.books : null);
            setBooksState('success');
          }
        }
      }
    })();
  }, [apiUserId]);

  // ─── Generation handlers ─────────────────────────────────────────────────
  const handleSummaryReload = useCallback(async () => {
    if (blockIfNoUses()) return;
    setSummaryState('loading');
    setSummaryError(undefined);
    try {
      const res = await generateSummary(apiUserId, ctx);
      setSummaryText(res.summary);
      setSummaryState('success');
      consumeAiUse();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setSummaryState(isNoUsesError(msg) ? 'no_uses' : 'error');
      setSummaryError(msg);
    }
  }, [apiUserId, ctx, blockIfNoUses, consumeAiUse]);

  const handlePhilosophersReload = useCallback(async () => {
    if (blockIfNoUses()) return;
    setPhilosophersState('loading');
    setPhilosophersError(undefined);
    try {
      const res = await generatePhilosophers(apiUserId, ctx);
      setPhilosophers(res.philosophers);
      setPhilosophersState('success');
      consumeAiUse();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setPhilosophersState(isNoUsesError(msg) ? 'no_uses' : 'error');
      setPhilosophersError(msg);
    }
  }, [apiUserId, ctx, blockIfNoUses, consumeAiUse]);

  const handleBooksReload = useCallback(() => {
    if (blockIfNoUses()) return;
    // Local deterministic engine — instant, no network needed.
    const result = getBookRecommendations(
      profile.rank,
      profile.philosophyPercentages,
      shownBookIds,
    );

    if (result.status === 'exhausted') {
      setBooksExhausted(true);
      setBooks(null);
      setBooksState('success');
      consumeAiUse();
      void savePhilosophyBooks(apiUserId, {
        books: [],
        shownBookIds,
        exhausted: true,
      });
      return;
    }

    const newBooks = result.books;
    const nextShownIds = [...shownBookIds, ...newBooks.map((b) => b.id)];
    setBooks(newBooks);
    setBooksExhausted(false);
    setBooksState('success');
    setShownBookIds(nextShownIds);
    consumeAiUse();
    void savePhilosophyBooks(apiUserId, {
      books: newBooks,
      shownBookIds: nextShownIds,
      exhausted: false,
    });
  }, [
    apiUserId,
    profile.rank,
    profile.philosophyPercentages,
    shownBookIds,
    blockIfNoUses,
    consumeAiUse,
  ]);

  // ─── Navigation ─────────────────────────────────────────────────────────
  const handleBottomTabChange = useCallback(
    (tab: TabId) => {
      router.navigate({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  // ─── Layout ─────────────────────────────────────────────────────────────
  const contentHeight = getAppShellScrollableBodyHeight(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => router.back()}
      />

      <View style={[styles.contentWrap, { height: contentHeight }]}>
        <ReflectionBackground clan={clanId}>
        {!ready ? (
          <ClanLoadingDot clanId={clanId} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Permanent clan badge record */}
            <ClanBadgesRecordCard
              rankHistory={clanRankHistory}
              onBadgePress={isPreviewActive ? cyclePreviewBadgeRank : undefined}
            />

            <View style={styles.gap} />

            {/* 2. AI philosophical summary */}
            <AiSummaryCard
              summary={summaryText}
              state={summaryState}
              errorMessage={summaryError}
              onReload={handleSummaryReload}
              usesAvailable={hasAiUses}
            />

            <View style={styles.gap} />

            {/* 3. Full clan percentages table */}
            <ClanPercentagesTable percentages={profile.philosophyPercentages} />

            <View style={styles.gap} />

            {/* 4. Detailed rank / progression */}
            <DetailedRankCard
              dominantClanLabel={dominant.label}
              dominantPct={dominant.pct}
              displayRank={profile.rank}
            />

            <View style={styles.gap} />

            {/* 5. Similar philosophers */}
            <SimilarPhilosophersCard
              philosophers={philosophers}
              state={philosophersState}
              errorMessage={philosophersError}
              onReload={handlePhilosophersReload}
              usesAvailable={hasAiUses}
            />

            <View style={styles.gap} />

            {/* 6. Book recommendations — full width */}
            <BookRecommendationsCard
              books={books}
              exhausted={booksExhausted}
              state={booksState}
              onReload={handleBooksReload}
              usesAvailable={hasAiUses}
            />

            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
        </ReflectionBackground>
      </View>

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => router.push({ pathname: '/reflection', params: { thoughtId: id } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: evoconnColors.background,
  },
  contentWrap: {
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  gap: {
    height: 14,
  },
  bottomSpacer: {
    height: 24,
  },
});
