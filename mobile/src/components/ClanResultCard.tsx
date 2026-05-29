import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';

const ICON_SIZE = 40;
const ICON_SCALE = 1.2;

export type ClanResultCardProps = {
  clanId: string;
  name: string;
  onPress?: () => void;
};

export function ClanResultCard({ clanId, name, onPress }: ClanResultCardProps) {
  const clanColor = getClanColor(clanId);
  const ClanBadge = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);
  const iconSide = ICON_SIZE * ICON_SCALE;

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.avatarWrap}>
        <ClanBadge width={iconSide} height={iconSide} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: clanColor }]}>Clan filosófico</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 4,
  },
  avatarWrap: {
    width: ICON_SIZE * ICON_SCALE,
    height: ICON_SIZE * ICON_SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'visible',
  },
  info: {
    flex: 1,
  },
  name: {
    color: evoconnColors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
});
