import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_X,
  PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_Y,
  PHILOSOPHY_PERCENTAGES_PANEL_WIDTH,
  PHILOSOPHY_PERCENTAGES_PANEL_HEIGHT,
  PERSONAL_PHILOSOPHY_CARD_OPACITY,
} from '@evoconn/constants/personalProfileLayout';
import {
  PHILOSOPHY_BANNER_SCALE,
  PHILOSOPHY_BANNER_OFFSET_X,
  PHILOSOPHY_BANNER_OFFSET_Y,
  PHILOSOPHY_ROW_GAP,
  PHILOSOPHY_CONTAINER_PADDING_TOP,
  PHILOSOPHY_CONTAINER_PADDING_BOTTOM,
  PHILOSOPHY_CONTAINER_PADDING_HORIZONTAL,
  PHILOSOPHY_ROW_HEIGHT,
  PHILOSOPHY_BAR_CLAN_COLORS,
  PHILOSOPHY_BAR_DEFAULT_COLOR,
} from '@evoconn/constants/philosophyBannerLayout';
import { PhilosophyClanBanner } from '@evoconn/components/shared/PhilosophyClanBanner';
import { GradientBarFill } from '@evoconn/components/shared/GradientBarFill';
import { getClanColor } from '@evoconn/constants/clanColors';

type PctEntry = { clanId: string; label: string; pct: number };

type Props = {
  percentages: PctEntry[];
  clanId?: string | null;
  /** When provided AND user has a clan, wraps panel in a TouchableOpacity. */
  onPress?: () => void;
};

export const PersonalPhilosophyPanel = React.memo(function PersonalPhilosophyPanel({
  percentages,
  clanId,
  onPress,
}: Props) {
  const titleColor = getClanColor(clanId ?? null);
  const sorted = [...percentages].sort((a, b) => b.pct - a.pct);
  const isSinClan = clanId === null || clanId === undefined;

  // Sin clan: tapping anywhere on the card shows the alert instead of navigating
  const effectivePress = isSinClan
    ? () => Alert.alert('', 'Sigue reflexionando...')
    : onPress;

  const inner = (
    <View
      style={[
        styles.container,
        PHILOSOPHY_PERCENTAGES_PANEL_WIDTH !== undefined && {
          width: PHILOSOPHY_PERCENTAGES_PANEL_WIDTH,
          alignSelf: 'center',
          marginHorizontal: 0,
        },
        PHILOSOPHY_PERCENTAGES_PANEL_HEIGHT !== undefined && { height: PHILOSOPHY_PERCENTAGES_PANEL_HEIGHT },
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: titleColor }]}>Pensamiento filosófico</Text>
        {isSinClan ? (
          <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.40)" />
        ) : (
          onPress && <Text style={styles.expandHint}>Ver detalle →</Text>
        )}
      </View>
      {sorted.map((entry, i) => (
        <View
          key={entry.clanId}
          style={[
            styles.row,
            i > 0 && { marginTop: PHILOSOPHY_ROW_GAP },
            PHILOSOPHY_ROW_HEIGHT !== undefined && { height: PHILOSOPHY_ROW_HEIGHT, overflow: 'hidden' },
          ]}
        >
          <PhilosophyClanBanner
            clanId={entry.clanId}
            label={entry.label}
            scale={PHILOSOPHY_BANNER_SCALE}
            offsetX={PHILOSOPHY_BANNER_OFFSET_X}
            offsetY={PHILOSOPHY_BANNER_OFFSET_Y}
            containerWidth={110}
            fallbackTextStyle={styles.label}
          />
          <View style={styles.barTrack}>
            <GradientBarFill
              widthStyle={`${entry.pct}%`}
              height={7}
              radius={4}
              clanColor={PHILOSOPHY_BAR_CLAN_COLORS[entry.clanId] ?? PHILOSOPHY_BAR_DEFAULT_COLOR}
              gradId={entry.clanId}
            />
          </View>
          <Text style={styles.pct}>{entry.pct}%</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View
      style={[
        styles.offsetWrap,
        {
          transform: [
            { translateX: PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_X },
            { translateY: PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_Y },
          ],
        },
      ]}
    >
      {effectivePress ? (
        <TouchableOpacity onPress={effectivePress} activeOpacity={0.75}>
          {inner}
        </TouchableOpacity>
      ) : (
        inner
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  offsetWrap: {
    alignSelf: 'stretch',
  },
  container: {
    marginHorizontal: 20,
    backgroundColor: `rgba(0,0,0,${PERSONAL_PHILOSOPHY_CARD_OPACITY})`,
    borderRadius: 14,
    paddingTop: PHILOSOPHY_CONTAINER_PADDING_TOP,
    paddingBottom: PHILOSOPHY_CONTAINER_PADDING_BOTTOM,
    paddingHorizontal: PHILOSOPHY_CONTAINER_PADDING_HORIZONTAL,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  expandHint: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 11,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    width: 110,
  },
  barTrack: {
    flex: 1,
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  pct: {
    fontSize: 13,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
    color: '#FFFFFF',
  },
});
