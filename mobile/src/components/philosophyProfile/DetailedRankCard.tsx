/**
 * Detailed rank/progression display.
 * Rank thresholds (based on dominant clan %):
 *   < 40      → Aprendiz
 *   40 – <50  → Maestro
 *   ≥  50     → Filósofo
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { PhilosophyInfoHelpButton } from '@evoconn/components/philosophyProfile/PhilosophyInfoHelpButton';

const RANK_HELP_STEPS = [
  'Para subir de rango, mejora el porcentaje filosófico de tu clan principal.',
  'Publica reflexiones o frases enfocadas en ese pensamiento filosófico.',
  'Infórmate, reflexiona y mejora con el tiempo para alcanzar Maestro (40%) y Filósofo (50%).',
];
import {
  RANK_BAR_GRADIENT_START,
  RANK_BAR_GRADIENT_END,
  RANK_BAR_BACKGROUND_COLOR,
  RANK_BAR_RADIUS,
} from '@evoconn/constants/personalProfileLayout';
import {
  getRankFromPct,
  getRankBarFill,
  getNextRankThreshold,
  RANK_THRESHOLDS,
} from '@evoconn/utils/getRankFromPct';
import type { Rank } from '@evoconn/types';

type Props = {
  dominantClanLabel: string;
  dominantPct: number;
  displayRank?: Rank;
};

const RANK_LABELS: Record<string, string> = {
  aprendiz: 'Aprendiz',
  maestro:  'Maestro',
  filosofo: 'Filósofo',
};

function getRankInfo(pct: number): {
  rank: string;
  nextRank: string | null;
  threshold: number | null;
  remaining: number | null;
} {
  const rankKey  = getRankFromPct(pct);
  const rank     = RANK_LABELS[rankKey];
  const next     = getNextRankThreshold(pct);

  if (next === null) {
    return { rank, nextRank: null, threshold: null, remaining: null };
  }

  const nextRankKey = next === RANK_THRESHOLDS.FILOSOFO ? 'Filósofo' : 'Maestro';
  return {
    rank,
    nextRank:  nextRankKey,
    threshold: next,
    remaining: Math.round((next - pct) * 10) / 10,
  };
}

export const DetailedRankCard = React.memo(function DetailedRankCard({
  dominantClanLabel,
  dominantPct,
  displayRank,
}: Props) {
  const { rank, nextRank, remaining } = getRankInfo(dominantPct);
  const badgeRank = displayRank ? RANK_LABELS[displayRank] : rank;
  const fill = getRankBarFill(dominantPct);

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
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Rango filosófico</Text>
        <PhilosophyInfoHelpButton
          title="Cómo subir de rango"
          steps={RANK_HELP_STEPS}
          accessibilityLabel="Información sobre rango filosófico"
        />
      </View>

      <View style={styles.rankRow}>
        <Text style={styles.pctBig}>{dominantPct}%</Text>
        <View style={styles.rankBadge}>
          <Text style={styles.rankLabel}>{badgeRank.toUpperCase()}</Text>
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
          {rank === 'Aprendiz' ? '0%' : rank === 'Maestro' ? '40%' : '50%'}
        </Text>
        {nextRank && (
          <Text style={styles.thresholdLabel}>
            {rank === 'Aprendiz' ? '40%' : '50%'}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
    flex: 1,
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
