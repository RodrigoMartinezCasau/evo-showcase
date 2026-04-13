import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_X,
  PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_Y,
  PHILOSOPHY_PERCENTAGES_PANEL_WIDTH,
  PHILOSOPHY_PERCENTAGES_PANEL_HEIGHT,
} from '@evoconn/constants/personalProfileLayout';

type PctEntry = { clanId: string; label: string; pct: number };

type Props = {
  percentages: PctEntry[];
  /** When provided, wraps the panel in a TouchableOpacity (personal profile only). */
  onPress?: () => void;
};

export const PersonalPhilosophyPanel = React.memo(function PersonalPhilosophyPanel({
  percentages,
  onPress,
}: Props) {
  const sorted = [...percentages].sort((a, b) => b.pct - a.pct);

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
        <Text style={styles.title}>Pensamiento filosófico</Text>
        {onPress && <Text style={styles.expandHint}>Ver detalle →</Text>}
      </View>
      {sorted.map((entry) => (
        <View key={entry.clanId} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>{entry.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${entry.pct}%` }]} />
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
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
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
    backgroundColor: '#000000',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
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
