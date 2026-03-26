import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SIDEBAR_FRASES_BUTTON_LAYOUT as L } from '@evoconn/constants/sidebarFrasesButtonLayout';
import { getFrasesButtonByHouse } from '@evoconn/utils/getSidebarFrasesButtonByHouse';

type FrasesButtonProps = {
  clanId: string | null;
  onPress: () => void;
};

/**
 * Capa flotante independiente del botón CLAN. Misma lógica de encuadre (contain + crop),
 * escala vía tamaño intrínseco del SVG (sin `transform: scale`) para mantener el vector nítido.
 */
export function FrasesButton({ clanId, onPress }: FrasesButtonProps) {
  const FrasesIcon = useMemo(() => getFrasesButtonByHouse(clanId), [clanId]);

  const vpW = L.FRASES_BUTTON_VIEWPORT_WIDTH;
  const vpH = L.FRASES_BUTTON_VIEWPORT_HEIGHT;
  const imgW = L.FRASES_BUTTON_SOURCE_WIDTH;
  const imgH = L.FRASES_BUTTON_SOURCE_HEIGHT;

  const cropT = L.FRASES_BUTTON_CROP_TOP;
  const cropB = L.FRASES_BUTTON_CROP_BOTTOM;
  const cropL = L.FRASES_BUTTON_CROP_LEFT;
  const cropR = L.FRASES_BUTTON_CROP_RIGHT;

  const visibleW = Math.max(1, imgW - cropL - cropR);
  const visibleH = Math.max(1, imgH - cropT - cropB);

  const s = Math.min(vpW / visibleW, vpH / visibleH);
  const drawnW = visibleW * s;
  const drawnH = visibleH * s;
  const centerOx = (vpW - drawnW) / 2;
  const centerOy = (vpH - drawnH) / 2;

  const sc = L.FRASES_BUTTON_SCALE;
  const outW = vpW * sc;
  const outH = vpH * sc;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: L.FRASES_BUTTON_OFFSET_X,
        top: L.FRASES_BUTTON_OFFSET_Y,
        zIndex: 19,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Frases"
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
          <FrasesIcon
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
