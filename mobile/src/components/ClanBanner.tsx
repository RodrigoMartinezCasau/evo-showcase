import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getClanColor } from '@evoconn/constants/clanColors';

type ClanBannerProps = {
  clanId: string | null;
  shortLabel: string;
  onPress?: () => void;
  small?: boolean;
};

export function ClanBanner({ clanId, shortLabel, onPress, small }: ClanBannerProps) {
  const color = getClanColor(clanId);
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper onPress={onPress} style={[styles.banner, { borderLeftColor: color }, small && styles.small]}>
      <Text style={[styles.label, small && styles.labelSmall]} numberOfLines={1}>
        {shortLabel}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderLeftWidth: 4,
    paddingLeft: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  small: { paddingLeft: 6, paddingVertical: 2 },
  label: { color: '#fff', fontSize: 12, fontWeight: '600' },
  labelSmall: { fontSize: 10 },
});
