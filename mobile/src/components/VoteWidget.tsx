import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { VoteStats } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';

type VoteWidgetProps = {
  stats: VoteStats;
  onUp?: () => void;
  onDown?: () => void;
  onSave?: () => void;
  compact?: boolean;
};

export function VoteWidget({ stats, onUp, onDown, onSave, compact }: VoteWidgetProps) {
  return (
    <View style={[styles.wrapper, compact && styles.compact]}>
      <TouchableOpacity onPress={onUp} style={styles.btn}>
        <Text style={styles.arrow}>▲</Text>
        <Text style={styles.count}>{stats.up}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDown} style={styles.btn}>
        <Text style={styles.arrowDown}>▼</Text>
        <Text style={styles.count}>{stats.down}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSave} style={styles.btn}>
        <Text style={styles.save}>⊕</Text>
        <Text style={styles.count}>{stats.save}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compact: { gap: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  arrow: { color: evoconnColors.neonGreen, fontSize: 14, marginRight: 2 },
  arrowDown: { color: evoconnColors.muted, fontSize: 14, marginRight: 2 },
  save: { color: evoconnColors.save, fontSize: 14, marginRight: 2 },
  count: { color: evoconnColors.muted, fontSize: 12 },
});
