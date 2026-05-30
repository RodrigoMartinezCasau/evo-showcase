/**
 * StreakScreen — shows the user's daily activity streak.
 * Three calendars (general / frases / reflexiones) + weekly stats.
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
  useWindowDimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';
import { fetchStreak, type StreakData } from '@evoconn/services/streakApi';
import { CalendarGrid } from '@evoconn/components/shared/CalendarGrid';
import { getTopBarRachaTopByHouse } from '@evoconn/utils/getTopBarRachaTopByHouse';
import { getClanStreakColors } from '@evoconn/constants/clanStreakColors';
import FuegoApagadoIcon from '../assets/topbar/fueguitoSvg/fuego-apagado.svg';
import { useDeferredRender } from '@evoconn/hooks/useDeferredRender';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import {
  IS_DEBUG_STREAK_MODE,
  useDebugStreak,
} from '../debug/DebugStreakContext';
import { useDebugStats } from '../debug/DebugStatsContext';
import { useAuth } from '../../mobile/lib/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns an array of the last `n` YYYY-MM-DD strings up to and including today,
 * computed in UTC to avoid DST edge cases.
 * Used in debug mode to synthesise a streak calendar from simulatedStreakDays.
 */
function generateLastNDays(n: number): string[] {
  if (n <= 0) return [];
  const result: string[] = [];
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = n - 1; i >= 0; i--) {
    result.push(new Date(todayUtc - i * 86_400_000).toISOString().slice(0, 10));
  }
  return result;
}
import {
  STREAK_CARD_PADDING_H,
  STREAK_CARD_PADDING_V,
  STREAK_SECTION_GAP,
  STREAK_CARD_RADIUS,
  STREAK_CARD_BACKGROUND,
  STREAK_COUNT_FONT_SIZE,
  STREAK_LABEL_FONT_SIZE,
  STREAK_STATS_NUMBER_FONT_SIZE,
  STREAK_STATS_UNIT_FONT_SIZE,
  STREAK_FIRE_ICON_SCALE,
} from '@evoconn/constants/streakLayout';
import {
  HERO_SUMMARY_ROW_GAP,
  HERO_STREAK_BASE_ICON_SIZE,
  heroIconSlotSize,
  heroIconVisualScale,
} from '@evoconn/constants/heroSummaryCardLayout';

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
  const safeFrame = useSafeAreaFrame();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const profile = getPersonalProfile();
  const { profile: authProfile } = useAuth();
  const { thoughts } = useThoughts();

  // Usa el ID real de Supabase si hay sesión; si no, cae al ID del perfil simulado.
  // Esto garantiza que fetchStreak consulta los datos del usuario autenticado real
  // y no los de la simulación (que provocaba que la pantalla mostrara datos de otro usuario).
  const realUserId = authProfile?.id ?? profile.id;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const ready = useDeferredRender();
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const FireIcon   = getTopBarRachaTopByHouse(activeClan); // encendido — clan-specific active fire
  const clanColors = getClanStreakColors(activeClan);
  // Apagado state always uses the single shared "fuego apagado.svg" (not clan-specific).

  // ─── Debug streak reactive state ──────────────────────────────────────────
  const { hasSentToday } = useDebugStreak();

  // ─── Debug stats (streak days / remaining uses simulation) ────────────────
  const { streakDays, setRealStreakDays, streakRecovery } = useDebugStats();

  // Aviso de recuperación: visible solo durante la ventana de 24 h (el día
  // siguiente al día saltado). Desaparece solo al pasar la ventana.
  const canRecoverStreak = streakRecovery.eligible;

  // Siempre usa el activity_log real de la API cuando esté disponible.
  // En modo debug sin datos de API (p.ej. sin sesión real) genera días sintéticos
  // a partir del contador local para que el calendario no quede vacío.
  const computedActivityLog = React.useMemo(
    () => (data?.activity_log?.length ? data.activity_log : generateLastNDays(streakDays)),
    [streakDays, data],
  );

  // ─── Fire icon transition animation ─────────────────────────────────────────
  // 0 = apagado fully visible; 1 = encendido fully visible
  const transitionAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim      = useRef(new Animated.Value(1)).current;
  const prevActiveRef  = useRef<boolean | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStreak(realUserId);
      setData(res);
      // Sincroniza el contador en el contexto compartido para que la barra superior
      // refleje el valor de la API cuando hay sesión real.
      setRealStreakDays(res.streak_current);
    } catch {
      setError('No se pudo cargar la racha. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [realUserId, setRealStreakDays]);

  useEffect(() => { load(); }, [load]);

  // ─── Fire icon state: PRODUCTION mode ────────────────────────────────────
  //
  //  In production, source of truth is data.activity_log from the backend.
  //  Rules: initial load → instant (no animation). false→true → ignition anim.
  useEffect(() => {
    if (IS_DEBUG_STREAK_MODE) return; // debug mode handled by its own effect below
    if (!data) return;

    const isActiveToday = data.activity_log.includes(today);

    if (prevActiveRef.current === null) {
      prevActiveRef.current = isActiveToday;
      transitionAnim.setValue(isActiveToday ? 1 : 0);
      scaleAnim.setValue(1);
      // eslint-disable-next-line no-console
      console.log(`[STREAK] Production: initial isActiveToday = ${isActiveToday}`);
      return;
    }

    if (prevActiveRef.current === isActiveToday) return;

    const wasInactive = prevActiveRef.current === false;
    prevActiveRef.current = isActiveToday;

    if (isActiveToday && wasInactive) {
      Animated.parallel([
        Animated.timing(transitionAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(scaleAnim, { toValue: 1.2, friction: 4, tension: 250, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1.0, friction: 6, tension: 200, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      transitionAnim.setValue(isActiveToday ? 1 : 0);
      scaleAnim.setValue(1);
    }
  }, [data, today, transitionAnim, scaleAnim]);

  // ─── Fire icon state: DEBUG mode ──────────────────────────────────────────
  //
  //  hasSentToday comes from React Context (useState), so React automatically
  //  re-renders this component and re-runs this effect the instant any screen
  //  in the app calls markStreakActivated() — no listeners, no focus tricks,
  //  no stale snapshots.
  //
  //  On mount: prevActiveRef is null → set fire state instantly (no animation).
  //  false → true transition: play ignition animation once.
  //  Subsequent calls (already true): no-op.
  useEffect(() => {
    if (!IS_DEBUG_STREAK_MODE) return;

    // eslint-disable-next-line no-console
    console.log(`[DEBUG STREAK] hasSentToday changed → ${hasSentToday}. prevActiveRef = ${prevActiveRef.current}. Clan = ${activeClan}`);

    if (prevActiveRef.current === null) {
      // First run (mount): jump to current state without animation.
      prevActiveRef.current = hasSentToday;
      transitionAnim.setValue(hasSentToday ? 1 : 0);
      scaleAnim.setValue(1);
      // eslint-disable-next-line no-console
      console.log(`[DEBUG STREAK] Initial state: fire = ${hasSentToday ? 'ENCENDIDO (clan)' : 'APAGADO (grey)'}`);
      return;
    }

    if (prevActiveRef.current === hasSentToday) return; // no change

    const wasInactive = prevActiveRef.current === false;
    prevActiveRef.current = hasSentToday;

    if (hasSentToday && wasInactive) {
      // Genuine apagado → encendido: play ignition animation.
      // eslint-disable-next-line no-console
      console.log(`[DEBUG STREAK] Fire activated! Playing ignition animation. Clan fire = ${activeClan}`);
      Animated.parallel([
        Animated.timing(transitionAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(scaleAnim, { toValue: 1.2, friction: 4, tension: 250, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1.0, friction: 6, tension: 200, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      transitionAnim.setValue(hasSentToday ? 1 : 0);
      scaleAnim.setValue(1);
    }
  }, [hasSentToday, activeClan, transitionAnim, scaleAnim]);

  const handleBottomTabChange = useCallback(
    (tab: TabId) => {
      router.navigate({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  // ─── Layout heights (shell unificado con Para Ti) ────────
  const contentHeight = getAppShellScrollableBodyHeight(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

  const totalDays = data?.activity_log.length ?? 0;

  const iconSlot = useMemo(() => heroIconSlotSize(screenW), [screenW]);
  const fireVisualScale = useMemo(
    () => heroIconVisualScale(HERO_STREAK_BASE_ICON_SIZE, iconSlot, STREAK_FIRE_ICON_SCALE),
    [iconSlot],
  );

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => router.back()}
      />

      <View style={[styles.contentWrap, { height: contentHeight }]}>
        {!ready ? (
          <ClanLoadingDot clanId={activeClan} />
        ) : (
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
              {/* ── Aviso de recuperación de racha (solo durante la ventana 24 h) ── */}
              {canRecoverStreak ? (
                <>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push('/phrase')}
                    style={[styles.recoverBanner, { borderColor: clanColors.tertiary }]}
                  >
                    <View style={styles.recoverBannerIconWrap}>
                      <FuegoApagadoIcon width={28} height={28} />
                    </View>
                    <Text style={[styles.recoverBannerText, { color: clanColors.tertiary }]}>
                      Publica una frase para restaurar tu racha anterior
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.gap} />
                </>
              ) : null}

              {/* ── Hero: streak count (icon + text centered as one block in the card) ── */}
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
                            transform: [{ scale: fireVisualScale }],
                          },
                        ]}
                      >
                        <View style={StyleSheet.absoluteFill}>
                          <FuegoApagadoIcon
                            width={HERO_STREAK_BASE_ICON_SIZE}
                            height={HERO_STREAK_BASE_ICON_SIZE}
                          />
                        </View>
                        <Animated.View
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              opacity: transitionAnim,
                              transform: [{ scale: scaleAnim }],
                            },
                          ]}
                        >
                          <FireIcon
                            width={HERO_STREAK_BASE_ICON_SIZE}
                            height={HERO_STREAK_BASE_ICON_SIZE}
                          />
                        </Animated.View>
                      </View>
                    </View>
                    <View style={styles.summaryTextGroup}>
                      <Text style={[styles.streakCount, { fontSize: STREAK_COUNT_FONT_SIZE }]}>
                        {streakDays}
                      </Text>
                      <Text style={styles.streakUnit}>días seguidos</Text>
                      <Text style={styles.streakSub}>Mantén tu consistencia diaria</Text>
                      {data.streak_best > 0 && (
                        <Text style={styles.bestStreak}>
                          Mejor racha:{' '}
                          <Text style={{ color: clanColors.tertiary }}>{data.streak_best} días</Text>
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.gap} />

              {/* ── Calendar: general ── */}
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { fontSize: STREAK_LABEL_FONT_SIZE }]}>
                  ACTIVIDAD GENERAL
                </Text>
                <CalendarGrid
                  activeDays={computedActivityLog}
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
        )}
      </View>

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </AppShellBottomTabsWrap>

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
  recoverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: STREAK_CARD_RADIUS,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recoverBannerIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoverBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
