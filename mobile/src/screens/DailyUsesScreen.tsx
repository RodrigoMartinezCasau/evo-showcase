/**
 * DailyUsesScreen — shows daily AI-use consumption.
 * Progress bar for today + heatmap calendar of historical usage.
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
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { evoconnColors } from '@evoconn/theme/colors';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import { fetchUsesLog, type UsesLogData } from '@evoconn/services/streakApi';
import {
  STREAK_CARD_PADDING_H,
  STREAK_CARD_PADDING_V,
  STREAK_SECTION_GAP,
  STREAK_CARD_RADIUS,
  STREAK_CARD_BACKGROUND,
  STREAK_COUNT_FONT_SIZE,
  STREAK_LABEL_FONT_SIZE,
  USES_BAR_HEIGHT,
  USES_BAR_RADIUS,
  USES_HEATMAP_SCALE,
} from '@evoconn/constants/streakLayout';

const DAILY_LIMIT = 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function heatmapColor(count: number, limit: number): string {
  if (count === 0) return 'rgba(255,255,255,0.07)';
  const ratio = count / limit;
  if (ratio <= 0.1) return '#2d6a4f';
  if (ratio <= 0.3) return '#40916c';
  if (ratio <= 0.6) return '#f4a261';
  return '#e63946';
}

function lastNDays(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function GradBar({ used, limit }: { used: number; limit: number }) {
  const [w, setW] = useState(0);
  const fillW = w > 0 ? Math.round(w * Math.min(used / limit, 1)) : 0;
  const color = heatmapColor(used, limit);
  return (
    <View
      style={[styles.barTrack, { height: USES_BAR_HEIGHT, borderRadius: USES_BAR_RADIUS }]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && fillW > 0 && (
        <Svg width={w} height={USES_BAR_HEIGHT} style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id="usesGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor={color} stopOpacity="1" />
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

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function UsesHeatmap({ log, scale }: { log: UsesLogData; scale: number }) {
  const { USES_HEATMAP_CELL_SIZE, USES_HEATMAP_CELL_GAP } = require('@evoconn/constants/streakLayout');
  const days = lastNDays(84);
  const cell = USES_HEATMAP_CELL_SIZE * scale;
  const gap = USES_HEATMAP_CELL_GAP * scale;

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <View>
      <View style={{ flexDirection: 'row', gap }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={{ gap }}>
            {week.map((day) => {
              const count = log[day] ?? 0;
              const isToday = day === new Date().toISOString().slice(0, 10);
              return (
                <View
                  key={day}
                  style={[
                    { width: cell, height: cell, borderRadius: 3 * scale, backgroundColor: heatmapColor(count, DAILY_LIMIT) },
                    isToday && { borderWidth: 1.5, borderColor: '#FFFFFF' },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Menos</Text>
        {[0, 0.05, 0.2, 0.5, 0.85].map((r, i) => (
          <View
            key={i}
            style={{
              width: cell * 0.8,
              height: cell * 0.8,
              borderRadius: 2 * scale,
              backgroundColor: heatmapColor(Math.round(r * DAILY_LIMIT), DAILY_LIMIT),
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
  const { height: screenH } = useWindowDimensions();
  const profile = getPersonalProfile();
  const { thoughts } = useThoughts();

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
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const contentHeight = screenH - topBarHeight - bottomBarHeight;

  const usedToday = log[today] ?? 0;
  const remaining = Math.max(DAILY_LIMIT - usedToday, 0);

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
              {/* ── Hero: uses count ── */}
              <View style={[styles.card, styles.heroCard]}>
                <Text style={[styles.usesCount, { fontSize: STREAK_COUNT_FONT_SIZE }]}>
                  ❤️ {remaining}
                </Text>
                <Text style={styles.usesUnit}>usos restantes hoy</Text>
                <Text style={styles.usesSub}>{usedToday} / {DAILY_LIMIT} usados</Text>
                <View style={{ width: '100%', marginTop: 8 }}>
                  <GradBar used={usedToday} limit={DAILY_LIMIT} />
                </View>
              </View>

              <View style={styles.gap} />

              {/* ── Heatmap ── */}
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                  HISTORIAL DE USOS (12 SEMANAS)
                </Text>
                <UsesHeatmap log={log} scale={USES_HEATMAP_SCALE} />
              </View>

              <View style={styles.gap} />

              {/* ── Info block ── */}
              <View style={styles.card}>
                <Text style={styles.infoText}>
                  Cada generación con IA consume 1 uso. Los usos se reinician cada día.
                </Text>
              </View>

              <View style={styles.bottomSpacer} />
            </>
          )}
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
    backgroundColor: STREAK_CARD_BACKGROUND,
    borderRadius: STREAK_CARD_RADIUS,
    paddingHorizontal: STREAK_CARD_PADDING_H,
    paddingVertical: STREAK_CARD_PADDING_V,
    gap: 12,
  },
  heroCard: {
    alignItems: 'center',
    gap: 4,
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
});
