import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SIDEBAR_CLAN_BUTTON_LAYOUT as L } from '@evoconn/constants/sidebarClanButtonLayout';
import { getClanButtonByHouse } from '@evoconn/utils/getSidebarClanButtonByHouse';

type SidebarClanButtonProps = {
  clanId: string | null;
  onPress: () => void;
};

/**
 * Capa flotante: `position: 'absolute'` respecto al `drawer`. El SVG se elige por clan;
 * CROP_* solo desplazan/encuadran el gráfico en pantalla (escala uniforme, sin achatar).
 */
export function SidebarClanButton({ clanId, onPress }: SidebarClanButtonProps) {
  const ClanIcon = useMemo(() => getClanButtonByHouse(clanId), [clanId]);

  const vpW = L.CLAN_BUTTON_VIEWPORT_WIDTH;
  const vpH = L.CLAN_BUTTON_VIEWPORT_HEIGHT;
  const imgW = L.CLAN_BUTTON_SOURCE_WIDTH;
  const imgH = L.CLAN_BUTTON_SOURCE_HEIGHT;

  const cropT = L.CLAN_BUTTON_CROP_TOP;
  const cropB = L.CLAN_BUTTON_CROP_BOTTOM;
  const cropL = L.CLAN_BUTTON_CROP_LEFT;
  const cropR = L.CLAN_BUTTON_CROP_RIGHT;

  const visibleW = Math.max(1, imgW - cropL - cropR);
  const visibleH = Math.max(1, imgH - cropT - cropB);

  /** Contain: con crop 0 se ve el asset entero dentro del viewport; con crop > 0 solo la sub-región, sin deformar. */
  const s = Math.min(vpW / visibleW, vpH / visibleH);
  const drawnW = visibleW * s;
  const drawnH = visibleH * s;
  const centerOx = (vpW - drawnW) / 2;
  const centerOy = (vpH - drawnH) / 2;

  /**
   * `CLAN_BUTTON_SCALE` como tamaño intrínseco, no como `transform: scale`.
   * Escalar la capa con transform rasteriza ~56×56 y luego la estira → SVG borroso.
   */
  const sc = L.CLAN_BUTTON_SCALE;
  const outW = vpW * sc;
  const outH = vpH * sc;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: L.CLAN_BUTTON_OFFSET_X,
        top: L.CLAN_BUTTON_OFFSET_Y,
        width: outW,
        height: outH,
        zIndex: 20,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          width: outW,
          height: outH,
          overflow: 'hidden',
          backgroundColor: 'transparent',
        }}
      >
        <ClanIcon
          width={imgW * s * sc}
          height={imgH * s * sc}
          style={{
            position: 'absolute',
            left: (-cropL * s + centerOx) * sc,
            top: (-cropT * s + centerOy) * sc,
            backgroundColor: 'transparent',
          }}
        />
      </View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Clan"
        style={{
          position: 'absolute',
          left: centerOx * sc,
          top: centerOy * sc,
          width: drawnW * sc,
          height: drawnH * sc,
        }}
      />
    </View>
  );
}
