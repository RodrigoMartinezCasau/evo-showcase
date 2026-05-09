import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { VoteStats } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  VOTE_DOWN_COUNT_ACTIVE_COLOR,
  VOTE_UP_COUNT_ACTIVE_COLOR,
} from '@evoconn/constants/voteButtonAppearance';

type VoteWidgetProps = {
  stats: VoteStats;
  /** Active user's current vote — drives the active/inactive icon color. */
  voted?: 'up' | 'down' | null;
  onUp?: () => void;
  onDown?: () => void;
  onSave?: () => void;
  compact?: boolean;
};

export function VoteWidget({ stats, voted = null, onUp, onDown, onSave, compact }: VoteWidgetProps) {
  return (
    <View style={[styles.wrapper, compact && styles.compact]}>
      <TouchableOpacity onPress={onUp} style={styles.btn}>
        <Text style={[styles.arrow, voted === 'up' && styles.arrowActive]}>▲</Text>
        <Text style={styles.count}>{stats.up}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDown} style={styles.btn}>
        <Text style={[styles.arrowDown, voted === 'down' && styles.arrowDownActive]}>▼</Text>
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
  arrow: { color: evoconnColors.muted, fontSize: 14, marginRight: 2 },
  arrowActive: { color: VOTE_UP_COUNT_ACTIVE_COLOR },
  arrowDown: { color: evoconnColors.muted, fontSize: 14, marginRight: 2 },
  arrowDownActive: { color: VOTE_DOWN_COUNT_ACTIVE_COLOR },
  save: { color: evoconnColors.save, fontSize: 14, marginRight: 2 },
  count: { color: evoconnColors.muted, fontSize: 12 },
});
