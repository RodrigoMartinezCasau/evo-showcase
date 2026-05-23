/**
 * ClanRankingCard.tsx
 * ===================
 * Muestra el ranking actual del clan (1–8) y sus puntos del mes en curso (Madrid).
 * Los puntos = media de (reflexiones + frases) publicadas por miembros del clan
 * en el mes natural, dividido entre el número de miembros del clan.
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
  /** Días restantes hasta el reinicio del período (mes natural o inicio 1-jun-2026). */
  daysLeft: number;
  /** false antes del 1 de junio de 2026: cuenta atrás al primer mes de competición. */
  competitionActive?: boolean;
  /** Miembros totales del clan (Supabase + sim demo). */
  membersCount: number;
};

const ORDINAL = ['', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°'];

export const ClanRankingCard = React.memo(function ClanRankingCard({
  clanId,
  rank,
  points,
  daysLeft,
  competitionActive = true,
  membersCount,
}: Props) {
  const clanColor = getClanColor(clanId);
  const rankLabel = ORDINAL[rank] ?? `${rank}°`;
  const pointsFormatted = points.toFixed(1);
  const periodBadge = competitionActive
    ? `Reinicia en ${daysLeft}d`
    : `Empieza en ${daysLeft}d`;

  return (
    <View style={[styles.card, { borderColor: `${clanColor}33` }]}>
      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: clanColor }]}>Ranking de clan</Text>
        <Text style={styles.periodBadge}>{periodBadge}</Text>
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

        {/* Points + members */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricValue}>{pointsFormatted}</Text>
            <Text style={styles.metricLabel}>puntos por{'\n'}miembro</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: `${clanColor}33` }]} />

          <View style={styles.metricBlock}>
            <Text style={styles.metricValue}>{membersCount}</Text>
            <Text style={styles.metricLabel}>miembros{'\n'}totales</Text>
          </View>
        </View>
      </View>

      {/* ── Footer ───────────────────────────────────────── */}
      <Text style={styles.footer}>
        {competitionActive
          ? 'Media de reflexiones y frases publicadas por miembro del clan este mes (hora española)'
          : 'La competición mensual entre clanes empieza el 1 de junio de 2026 (hora española)'}
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
  metricsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  metricBlock: {
    flex: 1,
    gap: 4,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  footer: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
});
