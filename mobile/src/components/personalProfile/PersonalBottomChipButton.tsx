import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { getClanColor } from '@evoconn/constants/clanColors';
import {
  BOTTOM_CHIP_HEIGHT,
  BOTTOM_CHIP_PADDING_HORIZONTAL,
  BOTTOM_CHIP_BORDER_RADIUS,
  BOTTOM_CHIP_FONT_SIZE,
  BOTTOM_CHIP_LETTER_SPACING,
  PERSONAL_BOTTOM_BLOCKS_OPACITY,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  label: string;
  clanId: string | null;
  onPress: () => void;
  accessibilityLabel?: string;
};

export const PersonalBottomChipButton = React.memo(function PersonalBottomChipButton({
  label,
  clanId,
  onPress,
  accessibilityLabel,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={styles.chip}
    >
      <Text style={[styles.label, { color: getClanColor(clanId) }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  chip: {
    backgroundColor: `rgba(0,0,0,${PERSONAL_BOTTOM_BLOCKS_OPACITY})`,
    height: BOTTOM_CHIP_HEIGHT,
    paddingHorizontal: BOTTOM_CHIP_PADDING_HORIZONTAL,
    borderRadius: BOTTOM_CHIP_BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: BOTTOM_CHIP_FONT_SIZE,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: BOTTOM_CHIP_LETTER_SPACING,
  },
});
