/**
 * Cajita de pensamiento filosófico (estilo frase insignia): estrellas + reborde
 * Apple blanco/clan. Solo el nombre del clan ("Realista", "Trascendentalista").
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { PanelStarField, PANEL_STAR_SURFACE_DEFAULT } from '@evoconn/components/animations/StarFieldBackground';
import { ClanCardFeedRimOverlay } from '@evoconn/components/ClanCardFeedRimOverlay';
import { getClanColor } from '@evoconn/constants/clanColors';
import {
  PHILOSOPHY_CLAN_CHIP_WIDTH,
  PHILOSOPHY_CLAN_CHIP_HEIGHT,
  PHILOSOPHY_CLAN_CHIP_RADIUS,
  PHILOSOPHY_CLAN_CHIP_RIM_ARM,
} from '@evoconn/constants/philosophyBannerLayout';

type Props = {
  clanId: string;
  /** Etiqueta corta del clan (p. ej. "Realista"). */
  label: string;
  /** Porcentaje 0 — cajita atenuada. */
  muted?: boolean;
};

const RIM_INSET = 1.5;

/** Solo el nombre del pensamiento, sin prefijo "Clan". */
export function formatPhilosophyClanShortLabel(label: string, clanId: string): string {
  const raw = (label || clanId || '').trim();
  if (!raw) return '?';
  const withoutClan = raw.replace(/^clan\s+/i, '').trim();
  const name = withoutClan || raw;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const PhilosophyClanLabel = React.memo(function PhilosophyClanLabel({
  clanId,
  label,
  muted = false,
}: Props) {
  const clanColor = getClanColor(clanId);
  const displayLabel = formatPhilosophyClanShortLabel(label, clanId);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDims((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
  }, []);

  return (
    <View
      style={[
        styles.chip,
        {
          width: PHILOSOPHY_CLAN_CHIP_WIDTH,
          height: PHILOSOPHY_CLAN_CHIP_HEIGHT,
          borderRadius: PHILOSOPHY_CLAN_CHIP_RADIUS,
          opacity: muted ? 0.42 : 1,
        },
      ]}
      onLayout={onLayout}
    >
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: PHILOSOPHY_CLAN_CHIP_RADIUS, overflow: 'hidden' }]}
        pointerEvents="none"
      >
        <PanelStarField surfaceColor={PANEL_STAR_SURFACE_DEFAULT} paused />
      </View>

      {dims ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: RIM_INSET,
            left: RIM_INSET,
            right: RIM_INSET,
            bottom: RIM_INSET,
          }}
        >
          <ClanCardFeedRimOverlay
            width={dims.width - RIM_INSET * 2}
            height={dims.height - RIM_INSET * 2}
            borderRadius={PHILOSOPHY_CLAN_CHIP_RADIUS - RIM_INSET}
            clanColor={clanColor}
            rimArm={PHILOSOPHY_CLAN_CHIP_RIM_ARM}
            corners="diagonal"
          />
        </View>
      ) : null}

      <View style={styles.textWrap}>
        <Text
          style={styles.text}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {displayLabel}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    overflow: 'hidden',
    backgroundColor: PANEL_STAR_SURFACE_DEFAULT,
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 1,
  },
  text: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.15,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});
