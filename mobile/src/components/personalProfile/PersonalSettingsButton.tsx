import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import BotonAjustesBlancoSvg from '../../assets/personalProfile/boton ajustes blanco.svg';
import {
  SETTINGS_ICON_OFFSET_X,
  SETTINGS_ICON_OFFSET_Y,
  SETTINGS_ICON_SCALE,
} from '@evoconn/constants/personalProfileLayout';

const BASE_SIZE = 28;

export const PersonalSettingsButton = React.memo(function PersonalSettingsButton() {
  const pathname = usePathname();

  const size = BASE_SIZE * SETTINGS_ICON_SCALE;
  const hit = Math.max(44, size + 16);

  return (
    <TouchableOpacity
      onPress={() => navigateUnlessCurrent(pathname, '/settings')}
      hitSlop={12}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel="Ajustes"
      style={[
        styles.button,
        {
          minWidth: hit,
          minHeight: hit,
          transform: [
            { translateX: SETTINGS_ICON_OFFSET_X },
            { translateY: SETTINGS_ICON_OFFSET_Y },
          ],
        },
      ]}
    >
      <BotonAjustesBlancoSvg width={size} height={size} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
});
