/**
 * StreakScreen — shows the user's daily activity streak.
 * Three calendars (general / frases / reflexiones) + weekly stats.
 * Connected to real backend data via streakApi.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { fetchStreak, type StreakData } from '@evoconn/services/streakApi';
import { CalendarGrid } from '@evoconn/components/shared/CalendarGrid';
import {
  STREAK_CARD_PADDING_H,
  STREAK_CARD_PADDING_V,
  STREAK_SECTION_GAP,
  STREAK_CARD_RADIUS,
  STREAK_COUNT_FONT_SIZE,
  STREAK_LABEL_FONT_SIZE,
  STREAK_STATS_NUMBER_FONT_SIZE,
  STREAK_STATS_UNIT_FONT_SIZE,
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
  const profile = getPersonalProfile();

  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStreak(profile.id);
      setData(res);
    } catch (e) {
      setError('No se pudo cargar la racha. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const totalDays = data?.activity_log.length ?? 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Racha</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
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
              <Text style={[styles.streakCount, { fontSize: STREAK_COUNT_FONT_SIZE }]}>
                🔥 {data.streak_current}
              </Text>
              <Text style={styles.streakUnit}>días seguidos</Text>
              <Text style={styles.streakSub}>Mantén tu consistencia diaria</Text>
              {data.streak_best > 0 && (
                <Text style={styles.bestStreak}>
                  Mejor racha: <Text style={{ color: evoconnColors.neonGreen }}>{data.streak_best} días</Text>
                </Text>
              )}
            </View>

            {/* ── Calendar: general ── */}
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                ACTIVIDAD GENERAL
              </Text>
              <CalendarGrid
                activeDays={data.activity_log}
                activeColor={evoconnColors.neonGreen}
                today={today}
              />
            </View>

            {/* ── Calendar: frases ── */}
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                FRASES
              </Text>
              <CalendarGrid
                activeDays={data.frases_log}
                activeColor="#C56BEA"
                today={today}
              />
            </View>

            {/* ── Calendar: reflexiones ── */}
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                REFLEXIONES
              </Text>
              <CalendarGrid
                activeDays={data.reflexiones_log}
                activeColor="#E53935"
                today={today}
              />
            </View>

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
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: evoconnColors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backIcon: { color: '#FFFFFF', fontSize: 22 },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scroll: {
    padding: 16,
    gap: STREAK_SECTION_GAP,
  },
  card: {
    backgroundColor: '#000000',
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
});
