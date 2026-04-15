/**
 * StreakScreen — shows the user's daily activity streak.
 * Three calendars (general / frases / reflexiones) + weekly stats.
 *
 * Layout: standard app shell (AppTopBar + BottomCommunityTabs).
 * Content scrolls between the two fixed bars.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import { fetchStreak, type StreakData } from '@evoconn/services/streakApi';
import { CalendarGrid } from '@evoconn/components/shared/CalendarGrid';
import { getTopBarRachaTopByHouse } from '@evoconn/utils/getTopBarRachaTopByHouse';
import { getClanStreakColors } from '@evoconn/constants/clanStreakColors';
import {
  STREAK_CARD_PADDING_H,
  STREAK_CARD_PADDING_V,
  STREAK_SECTION_GAP,
  STREAK_CARD_RADIUS,
  STREAK_COUNT_FONT_SIZE,
  STREAK_LABEL_FONT_SIZE,
  STREAK_STATS_NUMBER_FONT_SIZE,
  STREAK_STATS_UNIT_FONT_SIZE,
  STREAK_FIRE_ICON_SCALE,
  STREAK_FIRE_ICON_OFFSET_X,
  STREAK_FIRE_ICON_OFFSET_Y,
  STREAK_SUMMARY_TEXT_GROUP_OFFSET_X,
  STREAK_SUMMARY_TEXT_GROUP_OFFSET_Y,
} from '@evoconn/constants/streakLayout';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function weeklyAverage(log: string[], totalDays: number): string {
  if (totalDays === 0) return '0.0';
  const weeks = totalDays / 7;
  return (log.length / weeks).toFixed(1);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StreakScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const profile = getPersonalProfile();
  const { thoughts } = useThoughts();

  const activeClan  = useActiveClan(mockCurrentUser.clanId);
  const FireIcon    = getTopBarRachaTopByHouse(activeClan);
  const clanColors  = getClanStreakColors(activeClan);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStreak(profile.id);
      setData(res);
    } catch {
      setError('No se pudo cargar la racha. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  const handleBottomTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  // ─── Layout heights (same pattern as PersonalPhilosophyDetailScreen) ────────
  const topBarHeight = 60 + insets.top;
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const contentHeight = screenH - topBarHeight - bottomBarHeight;

  const today = new Date().toISOString().slice(0, 10);
  const totalDays = data?.activity_log.length ?? 0;

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => router.back()}
      />

      <View style={[styles.contentWrap, { height: contentHeight }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={evoconnColors.neonGreen} size="large" />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={load} style={styles.retryBtn}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : data ? (
            <>
              {/* ── Hero: streak count ── */}
              <View style={[styles.card, styles.heroCard]}>
                {/* Fire icon — independent, not inside text group */}
                <View
                  style={[
                    styles.fireIconWrap,
                    {
                      transform: [
                        { translateX: STREAK_FIRE_ICON_OFFSET_X },
                        { translateY: STREAK_FIRE_ICON_OFFSET_Y },
                        { scale: STREAK_FIRE_ICON_SCALE },
                      ],
                    },
                  ]}
                >
                  <FireIcon
                    width={STREAK_COUNT_FONT_SIZE}
                    height={STREAK_COUNT_FONT_SIZE}
                  />
                </View>

                {/* Text group — all four texts move together via shared offsets */}
                <View
                  style={[
                    styles.summaryTextGroup,
                    {
                      transform: [
                        { translateX: STREAK_SUMMARY_TEXT_GROUP_OFFSET_X },
                        { translateY: STREAK_SUMMARY_TEXT_GROUP_OFFSET_Y },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.streakCount, { fontSize: STREAK_COUNT_FONT_SIZE }]}>
                    {data.streak_current}
                  </Text>
                  <Text style={styles.streakUnit}>días seguidos</Text>
                  <Text style={styles.streakSub}>Mantén tu consistencia diaria</Text>
                  {data.streak_best > 0 && (
                    <Text style={styles.bestStreak}>
                      Mejor racha:{' '}
                      <Text style={{ color: evoconnColors.neonGreen }}>{data.streak_best} días</Text>
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.gap} />

              {/* ── Calendar: general ── */}
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                  ACTIVIDAD GENERAL
                </Text>
                <CalendarGrid
                  activeDays={data.activity_log}
                  activeColor={clanColors.tertiary}
                  today={today}
                  variant="streak-line"
                />
              </View>

              <View style={styles.gap} />

              {/* ── Calendar: frases ── */}
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                  FRASES
                </Text>
                <CalendarGrid
                  activeDays={data.frases_log}
                  activeColor={clanColors.secondary}
                  today={today}
                />
              </View>

              <View style={styles.gap} />

              {/* ── Calendar: reflexiones ── */}
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                  REFLEXIONES
                </Text>
                <CalendarGrid
                  activeDays={data.reflexiones_log}
                  activeColor={clanColors.primary}
                  today={today}
                />
              </View>

              <View style={styles.gap} />

              {/* ── Stats ── */}
              <View style={[styles.card, styles.statsCard]}>
                <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                  MEDIAS SEMANALES
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statBlock}>
                    <Text style={[styles.statNum, { fontSize: STREAK_STATS_NUMBER_FONT_SIZE }]}>
                      {weeklyAverage(data.frases_log, totalDays)}
                    </Text>
                    <Text style={[styles.statLabel, { fontSize: STREAK_STATS_UNIT_FONT_SIZE }]}>
                      frases / semana
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={[styles.statNum, { fontSize: STREAK_STATS_NUMBER_FONT_SIZE }]}>
                      {weeklyAverage(data.reflexiones_log, totalDays)}
                    </Text>
                    <Text style={[styles.statLabel, { fontSize: STREAK_STATS_UNIT_FONT_SIZE }]}>
                      reflexiones / semana
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.bottomSpacer} />
            </>
          ) : null}
        </ScrollView>
      </View>

      <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) =>
          router.push({ pathname: '/reflection', params: { thoughtId: id } })
        }
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
    paddingTop: 16,
  },
  gap: {
    height: STREAK_SECTION_GAP,
  },
  card: {
    backgroundColor: '#000000',
    borderRadius: STREAK_CARD_RADIUS,
    paddingHorizontal: STREAK_CARD_PADDING_H,
    paddingVertical: STREAK_CARD_PADDING_V,
    gap: 12,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fireIconWrap: {
    // Independent wrapper — transform here never reflows the text group
  },
  summaryTextGroup: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  streakCount: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  streakUnit: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  streakSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    marginTop: 4,
  },
  bestStreak: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  statsCard: { gap: 14 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statNum: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
  },
  errorText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
  },
  retryText: {
    color: evoconnColors.neonGreen,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 24,
  },
});
