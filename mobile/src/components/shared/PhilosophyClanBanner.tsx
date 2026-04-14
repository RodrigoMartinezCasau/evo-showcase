/**
 * Renders a clan estandarte SVG banner as a label replacement.
 * Falls back to the plain text label if no asset is found for the clan.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getClanEstandarte } from '@evoconn/utils/getClanEstandarte';
import { PHILOSOPHY_BANNER_BASE_SIZE } from '@evoconn/constants/philosophyBannerLayout';

type Props = {
  clanId: string;
  /** Fallback text shown when the SVG asset is not found. */
  label: string;
  /** Visual scale multiplier applied to the icon (default 1). */
  scale?: number;
  /** Horizontal nudge in pixels. */
  offsetX?: number;
  /** Vertical nudge in pixels. */
  offsetY?: number;
  /** Width of the label container that used to hold the text. */
  containerWidth?: number;
  /** Text style used for the fallback label. */
  fallbackTextStyle?: object;
};

export const PhilosophyClanBanner = React.memo(function PhilosophyClanBanner({
  clanId,
  label,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
  containerWidth = 110,
  fallbackTextStyle,
}: Props) {
  const BannerSvg = getClanEstandarte(clanId);
  const side = PHILOSOPHY_BANNER_BASE_SIZE * scale;

  if (!BannerSvg) {
    return (
      <Text style={[styles.fallback, { width: containerWidth }, fallbackTextStyle]} numberOfLines={1}>
        {label}
      </Text>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          width: containerWidth,
          transform: [
            { translateX: offsetX },
            { translateY: offsetY },
          ],
        },
      ]}
    >
      <BannerSvg
        width={side}
        height={side}
        preserveAspectRatio="xMidYMid meet"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'visible',
  },
  fallback: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});
