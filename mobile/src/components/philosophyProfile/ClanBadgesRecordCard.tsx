import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import type { ClanId } from '@evoconn/constants/clanColors';
import type { Rank } from '@evoconn/types';
import { getPhilosophyClanBadgeIcon } from '@evoconn/utils/getPhilosophyClanBadgeIcon';

type BadgeEntry = {
  clanId: ClanId;
  label: string;
};

const BADGE_ORDER: BadgeEntry[] = [
  { clanId: 'nihilista', label: 'Nihilistas' },
  { clanId: 'cientista', label: 'Cientistas' },
  { clanId: 'estoico', label: 'Estoicos' },
  { clanId: 'existencialista', label: 'Existencialistas' },
  { clanId: 'trascendentalista', label: 'Trascendentalistas' },
  { clanId: 'humanista', label: 'Humanistas' },
  { clanId: 'realista', label: 'Realistas' },
  { clanId: 'racionalista', label: 'Racionalistas' },
];

const BADGE_ROWS = [
  BADGE_ORDER.slice(0, 4),
  BADGE_ORDER.slice(4, 8),
];

type Props = {
  rankHistory: Partial<Record<ClanId, Rank>>;
  onBadgePress?: (clanId: ClanId) => void;
};

export const ClanBadgesRecordCard = React.memo(function ClanBadgesRecordCard({
  rankHistory,
  onBadgePress,
}: Props) {
  const { width } = useWindowDimensions();
  const cardInnerW = Math.max(0, width - 32 - 32);
  const badgeSize = Math.min(72, Math.max(52, Math.floor((cardInnerW - 30) / 4)));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Medallas de clan</Text>
      <View style={styles.grid}>
        {BADGE_ROWS.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.badgeRow}>
            {row.map(({ clanId, label }) => {
              const BadgeIcon = getPhilosophyClanBadgeIcon(clanId, rankHistory[clanId]);
              const Slot = onBadgePress ? TouchableOpacity : View;
              return (
                <Slot
                  key={clanId}
                  style={[styles.badgeSlot, { width: badgeSize }]}
                  accessibilityLabel={`${label}: ${rankHistory[clanId] ?? 'oculto'}`}
                  {...(onBadgePress
                    ? { activeOpacity: 0.72, onPress: () => onBadgePress(clanId) }
                    : {})}
                >
                  <BadgeIcon width={badgeSize} height={badgeSize} />
                </Slot>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000000',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  grid: {
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
