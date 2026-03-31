import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { REFLECTION_BACKGROUND_LAYOUT as L } from '@evoconn/constants/reflectionBackgroundLayout';
import { getReflectionBackgroundByHouse } from '@evoconn/utils/getReflectionBackgroundByHouse';

type ReflectionBackgroundProps = {
  clan: string | null | undefined;
  children: React.ReactNode;
};

/**
 * Wrapper that renders the clan-specific SVG background behind its children.
 * Use as:  <ReflectionBackground clan={clanId}>{content}</ReflectionBackground>
 */
export const ReflectionBackground = React.memo(function ReflectionBackground({ clan, children }: ReflectionBackgroundProps) {
  const BgIcon = useMemo(() => getReflectionBackgroundByHouse(clan), [clan]);

  return (
    <View style={styles.root}>
      <View
        pointerEvents="none"
        style={[styles.bgClip, { borderRadius: L.borderRadius }]}
      >
        <View
          style={[
            styles.bgInner,
            {
              transform: [
                { translateX: L.offsetX },
                { translateY: L.offsetY },
                { scale: L.scale },
              ],
            },
          ]}
        >
          <BgIcon width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
        </View>
      </View>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  bgClip: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  bgInner: {
    flex: 1,
  },
});
