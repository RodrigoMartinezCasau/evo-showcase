import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_BAR_LAYOUT, shellBottomOffsetPx } from '@evoconn/constants/bottomBarLayout';
import { evoconnColors } from '@evoconn/theme/colors';

type AppShellBottomTabsWrapProps = {
  children: React.ReactNode;
  backgroundColor?: string;
  borderTopWidth?: number;
  borderTopColor?: string;
};

/**
 * Contenedor único de la barra inferior flotante (mismo `paddingBottom`, `bottom` y márgenes que Para Ti).
 */
export function AppShellBottomTabsWrap({
  children,
  backgroundColor = evoconnColors.background,
  borderTopWidth = 1,
  borderTopColor = evoconnColors.background,
}: AppShellBottomTabsWrapProps) {
  const insets = useSafeAreaInsets();
  /** Inset completo del sistema (gesto / 3 botones). Nunca capar: si no, la barra queda encima de la nav de Android. */
  return (
    <View
      style={[
        styles.base,
        {
          paddingBottom: insets.bottom + BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION,
          paddingHorizontal: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HORIZONTAL_PADDING,
          bottom: shellBottomOffsetPx(),
          borderRadius: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BORDER_RADIUS,
          backgroundColor,
          borderTopWidth,
          borderTopColor,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
