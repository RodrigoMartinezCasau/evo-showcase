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
import React, { useCallback, useEffect, useState } from 'react';
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
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { usePreviewMode } from '@evoconn/debug/PreviewModeContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';

import { AiSummaryCard } from '@evoconn/components/philosophyProfile/AiSummaryCard';
import { ClanBadgesRecordCard } from '@evoconn/components/philosophyProfile/ClanBadgesRecordCard';
import { DetailedRankCard } from '@evoconn/components/philosophyProfile/DetailedRankCard';
import { ClanPercentagesTable } from '@evoconn/components/philosophyProfile/ClanPercentagesTable';
import { SimilarPhilosophersCard } from '@evoconn/components/philosophyProfile/SimilarPhilosophersCard';
import { BookRecommendationsCard } from '@evoconn/components/philosophyProfile/BookRecommendationsCard';
import { StudyRecommendationsCard } from '@evoconn/components/philosophyProfile/StudyRecommendationsCard';
import type { AiBlockState } from '@evoconn/components/philosophyProfile/AiBlockCard';

import {
  fetchPhilosophyProfile,
  generateSummary,
  generatePhilosophers,
  generateJobs,
  type PhilosopherEntry,
  type JobEntry,
  type PhilosophyContext,
} from '@evoconn/services/philosophyProfileApi';
import { recordUsesLog } from '@evoconn/services/streakApi';
import { getBookRecommendations } from '@evoconn/logic/books/getBookRecommendations';
import type { BookRecord } from '@evoconn/data/books/bookDatabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNoUsesError(msg: string): boolean {
  return msg.toLowerCase().includes('sin usos') || msg.toLowerCase().includes('quota') || msg.includes('429');
}

function buildContext(
  profile: ReturnType<typeof getPersonalProfile>,
  dominantClan: string,
): PhilosophyContext {
  return {
    username: profile.username,
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

  const baseProfile = getPersonalProfile();
  // Use real philosophical-classification data instead of seed mock values.
  const classification = useClassification();
  const realPercentages = classification.getPercentages(baseProfile.id);
  const clanRankHistory = isPreviewActive
    ? previewBadgeHistory
    : classification.getClanRankHistory(baseProfile.id);
  const profile = {
    ...baseProfile,
    philosophyPercentages: realPercentages,
    rank: classification.getDisplayRank(baseProfile.id),
  };
  const clanId = activeClan;

  // Dominant clan (highest pct)
  const sorted = [...profile.philosophyPercentages].sort((a, b) => b.pct - a.pct);
  const dominant = sorted[0] ?? { label: '', pct: 0 };
  const ctx = buildContext(profile, dominant.label);

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

  const [jobs, setJobs] = useState<JobEntry[] | null>(null);
  const [jobsState, setJobsState] = useState<AiBlockState>('idle');
  const [jobsError, setJobsError] = useState<string | undefined>();

  // ─── Load stored results on mount ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchPhilosophyProfile(profile.id);
        if (data.summary) { setSummaryText(data.summary); setSummaryState('success'); }
        if (data.philosophers) { setPhilosophers(data.philosophers); setPhilosophersState('success'); }
        // Books are now managed locally — do not restore from backend
        if (data.jobs) { setJobs(data.jobs); setJobsState('success'); }
      } catch {
        // Backend unreachable — show empty blocks, user can still try to generate
      }
    })();
  }, [profile.id]);

  // ─── Generation handlers ─────────────────────────────────────────────────
  const handleSummaryReload = useCallback(async () => {
    setSummaryState('loading');
    setSummaryError(undefined);
    try {
      const res = await generateSummary(profile.id, ctx);
      setSummaryText(res.summary);
      setSummaryState('success');
      recordUsesLog(profile.id).catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setSummaryState(isNoUsesError(msg) ? 'no_uses' : 'error');
      setSummaryError(msg);
    }
  }, [profile.id, ctx]);

  const handlePhilosophersReload = useCallback(async () => {
    setPhilosophersState('loading');
    setPhilosophersError(undefined);
    try {
      const res = await generatePhilosophers(profile.id, ctx);
      setPhilosophers(res.philosophers);
      setPhilosophersState('success');
      recordUsesLog(profile.id).catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setPhilosophersState(isNoUsesError(msg) ? 'no_uses' : 'error');
      setPhilosophersError(msg);
    }
  }, [profile.id, ctx]);

  const handleBooksReload = useCallback(() => {
    // Local deterministic engine — instant, no network needed.
    const result = getBookRecommendations(
      profile.rank,
      profile.philosophyPercentages,
      shownBookIds,
    );

    if (result.status === 'exhausted') {
      setBooksExhausted(true);
      setBooksState('success');
      return;
    }

    const newBooks = result.books;
    setBooks(newBooks);
    setBooksExhausted(false);
    setBooksState('success');
    // Add newly shown book ids to the history so they are never repeated
    setShownBookIds((prev) => [...prev, ...newBooks.map((b) => b.id)]);
    recordUsesLog(profile.id).catch(() => {});
  }, [profile.id, profile.rank, profile.philosophyPercentages, shownBookIds]);

  const handleJobsReload = useCallback(async () => {
    setJobsState('loading');
    setJobsError(undefined);
    try {
      const res = await generateJobs(profile.id, ctx);
      setJobs(res.jobs);
      setJobsState('success');
      recordUsesLog(profile.id).catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setJobsState(isNoUsesError(msg) ? 'no_uses' : 'error');
      setJobsError(msg);
    }
  }, [profile.id, ctx]);

  // ─── Navigation ─────────────────────────────────────────────────────────
  const handleBottomTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
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
            />

            <View style={styles.gap} />

            {/* 6. Two small side-by-side AI blocks */}
            <View style={styles.bottomRow}>
              <View style={styles.halfCard}>
                <BookRecommendationsCard
                  books={books}
                  exhausted={booksExhausted}
                  state={booksState}
                  onReload={handleBooksReload}
                />
              </View>
              <View style={styles.halfCard}>
                <StudyRecommendationsCard
                  jobs={jobs}
                  state={jobsState}
                  errorMessage={jobsError}
                  onReload={handleJobsReload}
                />
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
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
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  bottomSpacer: {
    height: 24,
  },
});
