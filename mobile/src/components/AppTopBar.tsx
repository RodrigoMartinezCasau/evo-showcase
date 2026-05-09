import React, { useMemo, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { evoconnColors } from '@evoconn/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOP_BAR_LAYOUT, topBarIconEditorStyle } from '@evoconn/constants/topBarLayout';
import { mockCurrentUser, mockUserStats } from '@evoconn/data/mockUser';
import { topBarIconFrameScale } from '@evoconn/assets/icons/topbar';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { usePreviewMode } from '@evoconn/debug/PreviewModeContext';
import { getTopBarStarColor } from '@evoconn/constants/clanColors';
import { getTopBarEstrellaByHouse } from '@evoconn/utils/getTopBarEstrellaByHouse';
import { getTopBarLapizByHouse } from '@evoconn/utils/getTopBarLapizByHouse';
import { getTopBarUsosByHouse } from '@evoconn/utils/getTopBarUsosByHouse';
import { getTopBarRachaTopByHouse } from '@evoconn/utils/getTopBarRachaTopByHouse';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';
import { getProgressionIcon } from '@evoconn/utils/getTopBarProgressionIcon';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import FuegoApagadoIcon from '../assets/topbar/fueguitoSvg/fuego-apagado.svg';
import { useDebugStreak, IS_DEBUG_STREAK_MODE } from '../debug/DebugStreakContext';
import { useDebugStats } from '../debug/DebugStatsContext';
import { useQuotes } from '../hooks/QuotesContext';

type AppTopBarProps = {
  onMenuPress: () => void;
  onClanPress?: () => void;
  showClanIcon?: boolean;
  clanShortLabel?: string;
  showCounters?: boolean;
  counts?: {
    pencil?: number;
    fire?: number;
    heart?: number;
  };
};

function iconFrame(size: number, scale: number) {
  const s = Math.round(size * scale);
  return { width: s, height: s };
}

function HamburgerIcon({
  size,
}: {
  size: number;
}) {
  const w = size;
  const h = size;
  const barH = Math.max(2, Math.round(size * 0.11));
  const gap = Math.max(2, Math.round(size * 0.16));
  const barW = Math.round(size * 0.78);

  return (
    <View style={[styles.hamburgerFrame, { width: w, height: h }]}>
      <View style={[styles.hamburgerBar, { width: barW, height: barH, marginBottom: gap }]} />
      <View style={[styles.hamburgerBar, { width: barW, height: barH, marginBottom: gap }]} />
      <View style={[styles.hamburgerBar, { width: barW, height: barH }]} />
    </View>
  );
}

export function AppTopBar({
  onMenuPress,
  onClanPress,
  showClanIcon = true,
  clanShortLabel,
  showCounters = true,
  counts,
}: AppTopBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const { isPreviewActive, previewClanId } = usePreviewMode();
  const { getVisibleClanId, getReflectionCount, getPhraseCount } = useClassification();
  const visibleClanId     = getVisibleClanId();
  const totalReflections  = getReflectionCount();
  const totalPhrases      = getPhraseCount();
  const progressionInputs = totalReflections + totalPhrases;

  // activeClan ya incorpora previewClanId cuando el modo preview está activo
  // (resuelto en useActiveClan → DebugClanContext). Se usa como alias claro.
  const effectiveClan = activeClan;
  const handleClanPress = () => {
    if (onClanPress) {
      onClanPress();
      return;
    }
    // Misma regla que SidebarDrawer: slug del clan visible o `indefinido` (= pantalla "Sin clan").
    const clanRouteSlug =
      effectiveClan != null && String(effectiveClan).trim() !== ''
        ? String(effectiveClan).trim().toLowerCase()
        : 'indefinido';
    router.push(`/clan/${clanRouteSlug}`);
  };

  const clanLabel =
    clanShortLabel ??
    (isPreviewActive ? 'MOD' : (effectiveClan ? effectiveClan.slice(0, 2).toUpperCase() : '??'));

  const { streakDays, remainingUses } = useDebugStats();
  const { totalUnlocked } = useQuotes();

  // Pencil counter = KB phrases unlocked via reflections. Always reads from
  // QuotesContext (persisted per-user) regardless of debug mode.
  const pencilCount = counts?.pencil ?? totalUnlocked;
  const fireCount   = counts?.fire   ?? streakDays;
  const heartCount  = counts?.heart  ?? remainingUses;

  const EstrellaIcon = useMemo(() => getTopBarEstrellaByHouse(effectiveClan), [effectiveClan]);
  const starTintColor = useMemo(() => getTopBarStarColor(effectiveClan), [effectiveClan]);
  const LapizIcon = useMemo(() => getTopBarLapizByHouse(effectiveClan), [effectiveClan]);
  const UsosIcon = useMemo(() => getTopBarUsosByHouse(effectiveClan), [effectiveClan]);
  const RachaIcon = useMemo(() => getTopBarRachaTopByHouse(effectiveClan), [effectiveClan]);
  const InsigniaIcon = useMemo(
    () => (isPreviewActive || visibleClanId)
      ? getTopBarInsigniaByHouse(effectiveClan)
      : getProgressionIcon(progressionInputs),
    [effectiveClan, isPreviewActive, visibleClanId, progressionInputs],
  );

  // ─── Top-bar fire icon animation (grey → clan on first send of the day) ────
  const { hasSentToday, statsLoaded } = useDebugStreak();
  const fireAnim    = useRef(new Animated.Value(0)).current;
  const prevFireRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Don't commit to any state until the real persisted value has been loaded
    // from AsyncStorage. This prevents a grey flash on app startup/node reload
    // when hasSentToday is false only because the async read hasn't completed yet.
    // Also reset the ref so each user switch triggers a fresh instant-set.
    if (!statsLoaded) {
      prevFireRef.current = null;
      return;
    }

    if (prevFireRef.current === null) {
      // First render after data loaded: set instantly without animation.
      prevFireRef.current = hasSentToday;
      fireAnim.setValue(hasSentToday ? 1 : 0);
      return;
    }

    if (prevFireRef.current === hasSentToday) return; // no change

    const wasInactive = prevFireRef.current === false;
    prevFireRef.current = hasSentToday;

    if (hasSentToday && wasInactive) {
      // Grey → clan fire: simple fade, matches the StreakScreen transition.
      Animated.timing(fireAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fireAnim.setValue(hasSentToday ? 1 : 0);
    }
  }, [hasSentToday, statsLoaded, fireAnim]);

  const statsScale = TOP_BAR_LAYOUT.RIGHT_CLUSTER_UNIVERSAL_SCALE;
  const starFrame = iconFrame(TOP_BAR_LAYOUT.STAR_SIZE * statsScale, topBarIconFrameScale.evoStar);
  const shieldFrame = iconFrame(TOP_BAR_LAYOUT.SHIELD_SIZE * statsScale, topBarIconFrameScale.shield);
  const counterIconFrame = iconFrame(TOP_BAR_LAYOUT.COUNTER_ICON_SIZE * statsScale, 1);
  const counterTextSize = TOP_BAR_LAYOUT.COUNTER_TEXT_SIZE * statsScale;
  const clanLabelFontSize = (TOP_BAR_LAYOUT.COUNTER_TEXT_SIZE + 1) * statsScale;
  const counterPairGap = TOP_BAR_LAYOUT.COUNTER_PAIR_GAP * statsScale;
  const counterNumMinW = 22 * statsScale;
  const unifiedStatsRowGap = TOP_BAR_LAYOUT.UNIFIED_STATS_ROW_GAP * statsScale;
  const menuDisplaySize = Math.round(TOP_BAR_LAYOUT.MENU_SIZE * statsScale);

  const previewClanLabel = isPreviewActive
    ? (previewClanId ? previewClanId.toUpperCase() : 'SIN CLAN')
    : null;

  return (
    <>
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + TOP_BAR_LAYOUT.SAFE_TOP_OFFSET,
          paddingHorizontal: TOP_BAR_LAYOUT.TOPBAR_PADDING_HORIZONTAL,
          paddingBottom: TOP_BAR_LAYOUT.TOPBAR_PADDING_BOTTOM,
          minHeight: TOP_BAR_LAYOUT.TOPBAR_MIN_HEIGHT + insets.top,
        },
      ]}
    >
      <View
        style={[
          styles.barRow,
          { transform: [{ translateY: TOP_BAR_LAYOUT.TOPBAR_WHOLE_SHIFT_Y }] },
        ]}
      >
        {/* Toda la barra de acciones en un solo grupo centrado: estrella, menú, clan, stats */}
        <View style={styles.statsRail}>
          <View style={[styles.unifiedStatsRow, { gap: unifiedStatsRowGap }]}>
            <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} hitSlop={14}>
              <View style={[styles.iconFrame, starFrame, topBarIconEditorStyle('star', 'star')]}>
                <EstrellaIcon
                  width={starFrame.width}
                  height={starFrame.height}
                  color={starTintColor}
                  style={{ color: starTintColor }}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} hitSlop={14}>
              <View
                style={[
                  styles.iconFrame,
                  { width: menuDisplaySize, height: menuDisplaySize },
                  topBarIconEditorStyle('menu', 'menu'),
                ]}
              >
                <HamburgerIcon size={menuDisplaySize} />
              </View>
            </TouchableOpacity>

            {showClanIcon && (
              <TouchableOpacity onPress={handleClanPress} style={styles.centerPress} hitSlop={12}>
                <View style={[styles.iconFrame, shieldFrame, topBarIconEditorStyle('shield', 'shield')]}>
                  <InsigniaIcon width={shieldFrame.width} height={shieldFrame.height} />
                </View>
                <View
                  style={[
                    styles.textBox,
                    { height: shieldFrame.height },
                    topBarIconEditorStyle('clanLabel', 'clanLabel'),
                  ]}
                >
                  <Text
                    style={[styles.clanLabel, { fontSize: clanLabelFontSize }]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {clanLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.push('/phrases-domains')}
              style={[styles.counterBtn, { gap: counterPairGap }]}
              hitSlop={14}
            >
              <View style={[styles.iconFrame, counterIconFrame, topBarIconEditorStyle('pencilIcon', 'pencilIcon')]}>
                <LapizIcon width={counterIconFrame.width} height={counterIconFrame.height} />
              </View>
              {showCounters && (
                <View style={[styles.textBox, { height: counterIconFrame.height }, topBarIconEditorStyle('pencilText', 'pencilText')]}>
                  <Text style={[styles.counterText, { fontSize: counterTextSize, minWidth: counterNumMinW }]}>{pencilCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/streak')}
              style={[styles.counterBtn, { gap: counterPairGap }]}
              hitSlop={14}
            >
              <View style={[styles.iconFrame, counterIconFrame, topBarIconEditorStyle('fireIcon', 'fireIcon')]}>
                <>
                  <Animated.View style={[StyleSheet.absoluteFill, { opacity: Animated.subtract(1, fireAnim) }]}>
                    <FuegoApagadoIcon width={counterIconFrame.width} height={counterIconFrame.height} />
                  </Animated.View>
                  <Animated.View style={[StyleSheet.absoluteFill, { opacity: fireAnim }]}>
                    <RachaIcon width={counterIconFrame.width} height={counterIconFrame.height} />
                  </Animated.View>
                </>
              </View>
              {showCounters && (
                <View style={[styles.textBox, { height: counterIconFrame.height }, topBarIconEditorStyle('fireText', 'fireText')]}>
                  <Text style={[styles.counterText, { fontSize: counterTextSize, minWidth: counterNumMinW }]}>{fireCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/daily-uses')}
              style={[styles.counterBtn, { gap: counterPairGap }]}
              hitSlop={14}
            >
              <View style={[styles.iconFrame, counterIconFrame, topBarIconEditorStyle('heartIcon', 'heartIcon')]}>
                <UsosIcon width={counterIconFrame.width} height={counterIconFrame.height} />
              </View>
              {showCounters && (
                <View style={[styles.textBox, { height: counterIconFrame.height }, topBarIconEditorStyle('heartText', 'heartText')]}>
                  <Text style={[styles.counterText, { fontSize: counterTextSize, minWidth: counterNumMinW }]}>{heartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>

    {/* Banner de preview — solo visible cuando el modo diseño está activo */}
    {isPreviewActive && previewClanLabel && (
      <View style={styles.previewBanner} pointerEvents="none">
        <Text style={styles.previewBannerText}>
          MOD — {previewClanLabel}
        </Text>
      </View>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: evoconnColors.background,
    borderBottomWidth: 1,
    borderBottomColor: evoconnColors.background,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  /** Fila única centrada (estrella + menú + clan + contadores). */
  statsRail: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 0,
  },
  unifiedStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  iconBtn: { paddingVertical: 6, paddingHorizontal: 6 },
  counterBtn: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  textBox: {
    justifyContent: 'center',
  },
  iconFrame: { alignItems: 'center', justifyContent: 'center' },
  hamburgerFrame: { alignItems: 'center', justifyContent: 'center' },
  hamburgerBar: {
    backgroundColor: evoconnColors.text,
    borderRadius: 999,
  },
  centerPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOP_BAR_LAYOUT.CENTER_CLUSTER_GAP,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clanLabel: {
    color: evoconnColors.text,
    fontWeight: '800',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  counterText: {
    color: evoconnColors.text,
    fontWeight: '800',
    textAlign: 'left',
    includeFontPadding: false,
  },
  previewBanner: {
    backgroundColor: 'rgba(199,255,2,0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199,255,2,0.25)',
    alignItems: 'center',
    paddingVertical: 3,
  },
  previewBannerText: {
    color: '#c7ff02',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
