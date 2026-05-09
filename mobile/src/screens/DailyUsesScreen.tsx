/**
 * DailyUsesScreen — shows daily AI-use consumption.
 * Progress bar for today + heatmap calendar of historical usage.
 *
 * Layout: standard app shell (AppTopBar + BottomCommunityTabs).
 * Content scrolls between the two fixed bars.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { evoconnColors } from '@evoconn/theme/colors';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { IS_DEBUG_STATS_MODE, useDebugStats } from '../debug/DebugStatsContext';
import {
  BOTTOM_BAR_LAYOUT,
  getBottomBarViewportReserveBottom,
} from '@evoconn/constants/bottomBarLayout';
import { fetchUsesLog, type UsesLogData } from '@evoconn/services/streakApi';
import { DAILY_USES_LIMIT } from '@evoconn/services/userStatsStorage';
import { getTopBarUsosByHouse } from '@evoconn/utils/getTopBarUsosByHouse';
import { getClanStreakColors } from '@evoconn/constants/clanStreakColors';
import {
  STREAK_CARD_PADDING_H,
  STREAK_CARD_PADDING_V,
  STREAK_SECTION_GAP,
  STREAK_CARD_RADIUS,
  STREAK_CARD_BACKGROUND,
  STREAK_COUNT_FONT_SIZE,
  STREAK_LABEL_FONT_SIZE,
  STREAK_DAY_CELL_SIZE,
  STREAK_DAY_CELL_GAP,
  USES_BAR_HEIGHT,
  USES_BAR_RADIUS,
  USES_CALENDAR_SCALE,
  USES_CALENDAR_OFFSET_X,
  USES_CALENDAR_OFFSET_Y,
  USAGE_HEART_ICON_SCALE,
} from '@evoconn/constants/streakLayout';
import {
  HERO_SUMMARY_ROW_GAP,
  HERO_STREAK_BASE_ICON_SIZE,
  heroIconSlotSize,
  heroIconVisualScale,
} from '@evoconn/constants/heroSummaryCardLayout';

const DAILY_LIMIT     = DAILY_USES_LIMIT;
const MAX_MONTHS_BACK = 12;
const NAV_SLIDE_DIST  = 350; // px — wider than any calendar grid

/** Returns [year, month 1-12] for the month `offset` steps from [baseY, baseM]. */
function getViewedYearMonth(baseY: number, baseM: number, offset: number): [number, number] {
  let m = baseM + offset;
  let y = baseY;
  while (m <= 0) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return [y, m];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function usageColor(count: number, limit: number): string {
  if (count === 0) return 'rgba(255,255,255,0.07)';
  const ratio = Math.min(count / limit, 1);
  if (ratio <= 0.1) return '#2d6a4f';
  if (ratio <= 0.3) return '#40916c';
  if (ratio <= 0.6) return '#f4a261';
  return '#e63946';
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const USAGE_DAY_NAMES   = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const USAGE_MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

function buildUsageMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay    = new Date(year, month - 1, 1).getDay(); // 0 = Sun
  const firstOffset = (firstDay + 6) % 7;                   // Mon = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

/** Clan primary color for the progress bar fill. Used when no clan is set. */
const NO_CLAN_BAR_COLOR = '#ff66c4';

function GradBar({ used, limit, clanColor }: { used: number; limit: number; clanColor: string }) {
  const [w, setW] = useState(0);
  const ratio = Math.min(used / limit, 1);
  const fillW = w > 0 ? Math.round(w * ratio) : 0;

  return (
    <View
      style={[styles.barTrack, { height: USES_BAR_HEIGHT, borderRadius: USES_BAR_RADIUS }]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && fillW > 0 && (
        <Svg width={w} height={USES_BAR_HEIGHT} style={StyleSheet.absoluteFillObject}>
          <Defs>
            {/*
             * gradientUnits="userSpaceOnUse" + x2={fillW} makes the gradient
             * stretch from 0 to fillW (the actual filled pixels), so the right
             * edge of the fill always shows the full clan color regardless of
             * how much of the bar is filled.
             */}
            <LinearGradient
              id="usesGrad"
              x1={0} y1={0}
              x2={fillW} y2={0}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor={clanColor} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect
            x={0} y={0}
            width={fillW} height={USES_BAR_HEIGHT}
            rx={USES_BAR_RADIUS} ry={USES_BAR_RADIUS}
            fill="url(#usesGrad)"
          />
        </Svg>
      )}
    </View>
  );
}

// ─── Usage calendar ───────────────────────────────────────────────────────────

function UsesCalendarGrid({ log, limit }: { log: UsesLogData; limit: number }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [ty, tm] = todayStr.split('-').map(Number);

  // ── Month navigation state ────────────────────────────────────────────────
  const [monthOffset, setMonthOffset] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [vy, vm] = React.useMemo(
    () => getViewedYearMonth(ty, tm, monthOffset),
    [ty, tm, monthOffset],
  );

  const atMin = monthOffset <= -MAX_MONTHS_BACK;
  const atMax = monthOffset >= 0;

  const handlePrev = useCallback(() => {
    if (atMin) return;
    slideAnim.setValue(-NAV_SLIDE_DIST);
    setMonthOffset(o => o - 1);
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [atMin, slideAnim]);

  const handleNext = useCallback(() => {
    if (atMax) return;
    slideAnim.setValue(NAV_SLIDE_DIST);
    setMonthOffset(o => o + 1);
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [atMax, slideAnim]);

  // ── Calendar data ─────────────────────────────────────────────────────────
  const rows       = buildUsageMonthGrid(vy, vm);
  const datePrefix = `${vy}-${String(vm).padStart(2, '0')}`;

  const cell = STREAK_DAY_CELL_SIZE * USES_CALENDAR_SCALE;
  const gap  = STREAK_DAY_CELL_GAP  * USES_CALENDAR_SCALE;
  const r    = cell / 2;

  return (
    <View style={{ width: '100%' }}>

      {/* ── Month navigation row ── */}
      <View style={styles.calMonthNavRow}>
        <TouchableOpacity
          onPress={handlePrev}
          disabled={atMin}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={[styles.calNavArrow, atMin && styles.calNavArrowDisabled]}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.calMonthLabel}>
          {USAGE_MONTH_NAMES[vm - 1]} {vy}
        </Text>

        <TouchableOpacity
          onPress={handleNext}
          disabled={atMax}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={[styles.calNavArrow, atMax && styles.calNavArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Calendar grid — slides on month change ── */}
      <View style={{ width: '100%', alignItems: 'center', overflow: 'hidden' }}>
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <View
            style={{
              transform: [
                { translateX: USES_CALENDAR_OFFSET_X },
                { translateY: USES_CALENDAR_OFFSET_Y },
              ],
            }}
          >
            {/* Weekday header */}
            <View style={{ flexDirection: 'row', gap }}>
              {USAGE_DAY_NAMES.map((d) => (
                <View
                  key={d}
                  style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontWeight: '600', fontSize: 9 * USES_CALENDAR_SCALE }}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day rows */}
            {rows.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap, marginTop: gap }}>
                {row.map((day, ci) => {
                  if (!day) return <View key={ci} style={{ width: cell, height: cell }} />;
                  const dateStr = `${datePrefix}-${String(day).padStart(2, '0')}`;
                  const count   = log[dateStr] ?? 0;
                  const isToday = dateStr === todayStr;
                  const color   = usageColor(count, limit);
                  const hasUses = count > 0;
                  return (
                    <View
                      key={ci}
                      style={[
                        {
                          width: cell, height: cell, borderRadius: r,
                          backgroundColor: color,
                          alignItems: 'center', justifyContent: 'center',
                        },
                        isToday && { borderWidth: 1.5, borderColor: '#FFFFFF' },
                      ]}
                    >
                      <Text
                        style={{
                          color:      hasUses ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                          fontSize:   10 * USES_CALENDAR_SCALE,
                          fontWeight: hasUses ? '700' : '500',
                        }}
                      >
                        {day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Legend — circles matching the calendar style */}
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Menos</Text>
        {[0, 0.05, 0.2, 0.5, 0.85].map((ratio, i) => (
          <View
            key={i}
            style={{
              width: cell * 0.65,
              height: cell * 0.65,
              borderRadius: cell * 0.325,
              backgroundColor: usageColor(Math.round(ratio * limit), limit),
            }}
          />
        ))}
        <Text style={styles.legendText}>Más</Text>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DailyUsesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const profile = getPersonalProfile();
  const { thoughts } = useThoughts();

  const activeClan   = useActiveClan(mockCurrentUser.clanId);
  const HeartIcon    = getTopBarUsosByHouse(activeClan);
  // Bar color: clan primary if the user has a clan, pink fallback if they don't.
  const barClanColor = activeClan
    ? getClanStreakColors(activeClan).primary
    : NO_CLAN_BAR_COLOR;

  // ─── Debug stats (streak days / remaining uses simulation) ────────────────
  const { remainingUses, setRealRemainingUses } = useDebugStats();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [log, setLog] = useState<UsesLogData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsesLog(profile.id);
      setLog(data);
    } catch {
      setError('No se pudo cargar el historial de usos.');
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

  // ─── Layout heights ───────────────────────────────────────────────────────
  const topBarHeight = 60 + insets.top;
  const bottomBarHeight = getBottomBarViewportReserveBottom(insets.bottom);
  const contentHeight = screenH - topBarHeight - bottomBarHeight;

  const usedToday = log[today] ?? 0;
  const realRemaining = Math.max(DAILY_LIMIT - usedToday, 0);

  // Push real value into shared context whenever it changes so the top bar
  // can reflect it in production mode.
  useEffect(() => {
    setRealRemainingUses(realRemaining);
  }, [realRemaining, setRealRemainingUses]);

  // ─── Single source of truth for all usage UI ─────────────────────────────
  // In debug mode every UI element (summary, bar, text, calendar) derives
  // from remainingUses; in prod everything derives from the real API log.
  const computedRemaining  = Math.min(
    Math.max(IS_DEBUG_STATS_MODE ? remainingUses : realRemaining, 0),
    DAILY_LIMIT,
  );
  const computedUsedToday  = Math.min(Math.max(DAILY_LIMIT - computedRemaining, 0), DAILY_LIMIT);
  // Override today's entry in the log so the calendar matches the simulated value.
  const computedLog        = IS_DEBUG_STATS_MODE
    ? { ...log, [today]: computedUsedToday }
    : log;

  const iconSlot = useMemo(() => heroIconSlotSize(screenW), [screenW]);
  const heartVisualScale = useMemo(
    () => heroIconVisualScale(HERO_STREAK_BASE_ICON_SIZE, iconSlot, USAGE_HEART_ICON_SCALE),
    [iconSlot],
  );

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
          ) : (
            <>
              {/* ── Hero: uses count (icon + text centered as one block) ── */}
              <View style={styles.card}>
                <View style={styles.heroCenterSlot}>
                  <View style={[styles.heroBlock, { gap: HERO_SUMMARY_ROW_GAP }]}>
                    <View style={[styles.iconSlot, { width: iconSlot, height: iconSlot }]}>
                      <View
                        style={[
                          styles.iconScaledInner,
                          {
                            width: HERO_STREAK_BASE_ICON_SIZE,
                            height: HERO_STREAK_BASE_ICON_SIZE,
                            transform: [{ scale: heartVisualScale }],
                          },
                        ]}
                      >
                        <HeartIcon
                          width={HERO_STREAK_BASE_ICON_SIZE}
                          height={HERO_STREAK_BASE_ICON_SIZE}
                        />
                      </View>
                    </View>
                    <View style={styles.summaryTextGroup}>
                      <Text style={[styles.usesCount, { fontSize: STREAK_COUNT_FONT_SIZE }]}>
                        {computedRemaining}
                      </Text>
                      <Text style={styles.usesUnit}>usos restantes hoy</Text>
                      <Text style={styles.usesSub}>{computedUsedToday} / {DAILY_LIMIT} usados</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.barWrap}>
                  <GradBar used={computedUsedToday} limit={DAILY_LIMIT} clanColor={barClanColor} />
                </View>
              </View>

              <View style={styles.gap} />

              {/* ── Usage calendar ── */}
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                  HISTORIAL DE USOS
                </Text>
                <UsesCalendarGrid log={computedLog} limit={DAILY_LIMIT} />
              </View>

              <View style={styles.gap} />

              {/* ── Info block ── */}
              <View style={styles.card}>
                <Text style={styles.infoText}>
                  Cada generación consume 1 uso. Los usos se reinician cada día.
                </Text>
              </View>

              <View style={styles.bottomSpacer} />
            </>
          )}
        </ScrollView>
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
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </View>

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
    backgroundColor: STREAK_CARD_BACKGROUND,
    borderRadius: STREAK_CARD_RADIUS,
    borderWidth: 1,
    borderColor: evoconnColors.border,
    paddingHorizontal: STREAK_CARD_PADDING_H,
    paddingVertical: STREAK_CARD_PADDING_V,
    gap: 12,
  },
  heroCenterSlot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  heroBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconScaledInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextGroup: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    flexShrink: 1,
    minWidth: 0,
  },
  barWrap: {
    width: '100%',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  usesCount: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  usesUnit: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  usesSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
  },
  barTrack: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  calMonthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calNavArrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 22,
    fontWeight: '300',
    width: 24,
    textAlign: 'center',
  },
  calNavArrowDisabled: {
    color: 'rgba(255,255,255,0.18)',
  },
  calMonthLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  legendText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
  },
  infoText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 18,
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
