import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SIDEBAR_RACHA_BUTTON_LAYOUT as L } from '@evoconn/constants/sidebarRachaButtonLayout';
import { getRachaButtonByHouse } from '@evoconn/utils/getSidebarRachaButtonByHouse';

type RachaButtonProps = {
  clanId: string | null;
  onPress: () => void;
};

/**
 * Capa flotante independiente de CLAN y FRASES. Contain + crop + escala intrínseca del SVG
 * (sin `transform: scale`) para vector nítido.
 */
export function RachaButton({ clanId, onPress }: RachaButtonProps) {
  const RachaIcon = useMemo(() => getRachaButtonByHouse(clanId), [clanId]);

  const vpW = L.RACHA_BUTTON_VIEWPORT_WIDTH;
  const vpH = L.RACHA_BUTTON_VIEWPORT_HEIGHT;
  const imgW = L.RACHA_BUTTON_SOURCE_WIDTH;
  const imgH = L.RACHA_BUTTON_SOURCE_HEIGHT;

  const cropT = L.RACHA_BUTTON_CROP_TOP;
  const cropB = L.RACHA_BUTTON_CROP_BOTTOM;
  const cropL = L.RACHA_BUTTON_CROP_LEFT;
  const cropR = L.RACHA_BUTTON_CROP_RIGHT;

  const visibleW = Math.max(1, imgW - cropL - cropR);
  const visibleH = Math.max(1, imgH - cropT - cropB);

  const s = Math.min(vpW / visibleW, vpH / visibleH);
  const drawnW = visibleW * s;
  const drawnH = visibleH * s;
  const centerOx = (vpW - drawnW) / 2;
  const centerOy = (vpH - drawnH) / 2;

  const sc = L.RACHA_BUTTON_SCALE;
  const outW = vpW * sc;
  const outH = vpH * sc;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: L.RACHA_BUTTON_OFFSET_X,
        top: L.RACHA_BUTTON_OFFSET_Y,
        zIndex: 18,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Racha"
        hitSlop={8}
        style={{ width: outW, height: outH }}
      >
        <View
          style={{
            width: outW,
            height: outH,
            overflow: 'hidden',
            backgroundColor: 'transparent',
          }}
        >
          <RachaIcon
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
      </TouchableOpacity>
    </View>
  );
}
