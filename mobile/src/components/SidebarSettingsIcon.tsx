import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import SettingsSvg from '../assets/sidebar/settingsIconSvg/settings.svg';
import { SIDEBAR_SETTINGS_ICON_LAYOUT as L } from '@evoconn/constants/sidebarSettingsIconLayout';

const VIEWBOX_W = 600;
const VIEWBOX_H = 600;

function getRenderedDimensions(): { width: number; height: number } {
  const wCfg = L.SIDEBAR_SETTINGS_ICON_WIDTH;
  const hCfg = L.SIDEBAR_SETTINGS_ICON_HEIGHT;

  if (wCfg > 0) {
    const width = wCfg;
    const height = hCfg > 0 ? hCfg : width;
    return { width, height };
  }
  if (hCfg > 0) {
    const height = hCfg;
    return { width: height * (VIEWBOX_W / VIEWBOX_H), height };
  }

  const side = VIEWBOX_W * L.SIDEBAR_SETTINGS_ICON_SCALE;
  return { width: side, height: side * (VIEWBOX_H / VIEWBOX_W) };
}

type SidebarSettingsIconProps = {
  onPress: () => void;
};

/**
 * Esquina inferior derecha del drawer; mismo plano visual que insignia + texto de perfil.
 */
export function SidebarSettingsIcon({ onPress }: SidebarSettingsIconProps) {
  const { width, height } = getRenderedDimensions();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: L.SIDEBAR_SETTINGS_ICON_OFFSET_X,
        bottom: L.SIDEBAR_SETTINGS_ICON_OFFSET_Y,
        zIndex: 18,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Ajustes"
        hitSlop={10}
        style={{ backgroundColor: 'transparent' }}
      >
        <SettingsSvg
          width={width}
          height={height}
          style={{ backgroundColor: 'transparent' }}
        />
      </TouchableOpacity>
    </View>
  );
}
