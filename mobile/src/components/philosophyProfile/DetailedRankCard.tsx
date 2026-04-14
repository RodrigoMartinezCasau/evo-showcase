/**
 * Detailed rank/progression display.
 * Rank thresholds (based on dominant clan %):
 *   0 – <50   → Aprendiz
 *   50 – <90  → Maestro
 *   90 – 100  → Filósofo
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
  RANK_BAR_GRADIENT_START,
  RANK_BAR_GRADIENT_END,
  RANK_BAR_BACKGROUND_COLOR,
  RANK_BAR_RADIUS,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  dominantClanLabel: string;
  dominantPct: number;
};

function getRankInfo(pct: number): {
  rank: string;
  nextRank: string | null;
  threshold: number | null;
  remaining: number | null;
} {
  if (pct < 50) {
    return { rank: 'Aprendiz', nextRank: 'Maestro', threshold: 50, remaining: 50 - pct };
  }
  if (pct < 90) {
    return { rank: 'Maestro', nextRank: 'Filósofo', threshold: 90, remaining: 90 - pct };
  }
  return { rank: 'Filósofo', nextRank: null, threshold: null, remaining: null };
}

/** Fill fraction (0–1) of the visible bar from current segment start to pct. */
function getBarFill(pct: number): number {
  if (pct < 50) return pct / 50;
  if (pct < 90) return (pct - 50) / 40;
  return 1;
}

export const DetailedRankCard = React.memo(function DetailedRankCard({
  dominantClanLabel,
  dominantPct,
}: Props) {
  const { rank, nextRank, remaining } = getRankInfo(dominantPct);
  const fill = getBarFill(dominantPct);

  const [trackW, setTrackW] = useState(0);
  const onTrackLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setTrackW(e.nativeEvent.layout.width);
    },
    [],
  );
  const fillW = Math.round(trackW * fill);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Rango filosófico</Text>

      <View style={styles.rankRow}>
        <Text style={styles.pctBig}>{dominantPct}%</Text>
        <View style={styles.rankBadge}>
          <Text style={styles.rankLabel}>{rank.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.clanLine}>{dominantClanLabel}</Text>

      {/* Progress bar — gradient matches PersonalRankProgression */}
      <View style={styles.barTrack} onLayout={onTrackLayout}>
        {trackW > 0 && fillW > 0 && (
          <Svg width={trackW} height={styles.barTrack.height} style={StyleSheet.absoluteFillObject}>
            <Defs>
              <LinearGradient id="drc_grad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={RANK_BAR_GRADIENT_START} stopOpacity="1" />
                <Stop offset="1" stopColor={RANK_BAR_GRADIENT_END} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={fillW}
              height={styles.barTrack.height}
              rx={RANK_BAR_RADIUS}
              ry={RANK_BAR_RADIUS}
              fill="url(#drc_grad)"
            />
          </Svg>
        )}
      </View>

      {/* Threshold labels */}
      <View style={styles.thresholdRow}>
        <Text style={styles.thresholdLabel}>
          {rank === 'Aprendiz' ? '0%' : rank === 'Maestro' ? '50%' : '90%'}
        </Text>
        {nextRank && (
          <Text style={styles.thresholdLabel}>
            {rank === 'Aprendiz' ? '50%' : '90%'}
          </Text>
        )}
      </View>

      {/* Progress message */}
      {remaining !== null ? (
        <Text style={styles.progressMsg}>
          Falta un <Text style={styles.progressHighlight}>{remaining}%</Text> para {nextRank}
        </Text>
      ) : (
        <Text style={styles.progressMsg}>
          Has alcanzado el rango máximo.
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000000',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pctBig: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
  },
  rankBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rankLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  clanLine: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
  },
  barTrack: {
    height: 8,
    backgroundColor: RANK_BAR_BACKGROUND_COLOR,
    borderRadius: RANK_BAR_RADIUS,
    overflow: 'hidden',
    marginTop: 4,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thresholdLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
  progressMsg: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  progressHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
