/**
 * ClanRankingCard.tsx
 * ===================
 * Muestra el ranking actual del clan (1–8) y sus puntos del período (30 días).
 * Los puntos = media de (reflexiones + frases) publicadas por miembros del clan
 * en el período actual de 30 días, dividido entre el número de miembros del clan.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getClanColor } from '@evoconn/constants/clanColors';

type Props = {
  /** ID del clan que se está mostrando. */
  clanId: string;
  /** Posición en el ranking (1 = mejor, 8 = último). */
  rank: number;
  /** Puntos del período actual (media de posts por miembro). */
  points: number;
  /** Días restantes hasta el reinicio del período (0–30). */
  daysLeft: number;
};

const ORDINAL = ['', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°'];

export const ClanRankingCard = React.memo(function ClanRankingCard({
  clanId,
  rank,
  points,
  daysLeft,
}: Props) {
  const clanColor = getClanColor(clanId);
  const rankLabel = ORDINAL[rank] ?? `${rank}°`;
  const pointsFormatted = points.toFixed(1);

  return (
    <View style={[styles.card, { borderColor: `${clanColor}33` }]}>
      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: clanColor }]}>Ranking de clan</Text>
        <Text style={styles.periodBadge}>Reinicia en {daysLeft}d</Text>
      </View>

      {/* ── Main stats ───────────────────────────────────── */}
      <View style={styles.statsRow}>
        {/* Rank */}
        <View style={[styles.rankBadge, { borderColor: clanColor }]}>
          <Text style={[styles.rankNumber, { color: clanColor }]}>{rankLabel}</Text>
          <Text style={[styles.rankSub, { color: clanColor }]}>de 8 clanes</Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: `${clanColor}33` }]} />

        {/* Points */}
        <View style={styles.pointsBlock}>
          <Text style={styles.pointsValue}>{pointsFormatted}</Text>
          <Text style={styles.pointsLabel}>puntos por{'\n'}miembro</Text>
        </View>
      </View>

      {/* ── Footer ───────────────────────────────────────── */}
      <Text style={styles.footer}>
        Media de reflexiones y frases publicadas por miembro del clan en los últimos 30 días
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    backgroundColor: '#000000',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  periodBadge: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.40)',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  rankBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  rankNumber: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  rankSub: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    opacity: 0.75,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 52,
    borderRadius: 1,
  },
  pointsBlock: {
    flex: 1,
    gap: 4,
  },
  pointsValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  pointsLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  footer: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
});
