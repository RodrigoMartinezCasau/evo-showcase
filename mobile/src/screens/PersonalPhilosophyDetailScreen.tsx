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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';

import { AiSummaryCard } from '@evoconn/components/philosophyProfile/AiSummaryCard';
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
  generateBooks,
  generateJobs,
  type PhilosopherEntry,
  type BookEntry,
  type JobEntry,
  type PhilosophyContext,
} from '@evoconn/services/philosophyProfileApi';

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
  const { height: screenH } = useWindowDimensions();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const { thoughts } = useThoughts();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const profile = getPersonalProfile();
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

  const [books, setBooks] = useState<BookEntry[] | null>(null);
  const [booksState, setBooksState] = useState<AiBlockState>('idle');
  const [booksError, setBooksError] = useState<string | undefined>();

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
        if (data.books) { setBooks(data.books); setBooksState('success'); }
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setPhilosophersState(isNoUsesError(msg) ? 'no_uses' : 'error');
      setPhilosophersError(msg);
    }
  }, [profile.id, ctx]);

  const handleBooksReload = useCallback(async () => {
    setBooksState('loading');
    setBooksError(undefined);
    try {
      const res = await generateBooks(profile.id, ctx);
      setBooks(res.books);
      setBooksState('success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setBooksState(isNoUsesError(msg) ? 'no_uses' : 'error');
      setBooksError(msg);
    }
  }, [profile.id, ctx]);

  const handleJobsReload = useCallback(async () => {
    setJobsState('loading');
    setJobsError(undefined);
    try {
      const res = await generateJobs(profile.id, ctx);
      setJobs(res.jobs);
      setJobsState('success');
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
  const topBarHeight = 60 + insets.top;
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const contentHeight = screenH - topBarHeight - bottomBarHeight;

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
            {/* 1. AI philosophical summary */}
            <AiSummaryCard
              summary={summaryText}
              state={summaryState}
              errorMessage={summaryError}
              onReload={handleSummaryReload}
            />

            <View style={styles.gap} />

            {/* 2. Detailed rank / progression */}
            <DetailedRankCard
              dominantClanLabel={dominant.label}
              dominantPct={dominant.pct}
            />

            <View style={styles.gap} />

            {/* 3. Full clan percentages table */}
            <ClanPercentagesTable percentages={profile.philosophyPercentages} />

            <View style={styles.gap} />

            {/* 4. Similar philosophers */}
            <SimilarPhilosophersCard
              philosophers={philosophers}
              state={philosophersState}
              errorMessage={philosophersError}
              onReload={handlePhilosophersReload}
            />

            <View style={styles.gap} />

            {/* 5. Two small side-by-side AI blocks */}
            <View style={styles.bottomRow}>
              <View style={styles.halfCard}>
                <BookRecommendationsCard
                  books={books}
                  state={booksState}
                  errorMessage={booksError}
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

      <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />

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
