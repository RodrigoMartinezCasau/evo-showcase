import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { PanelStarField, PANEL_STAR_SURFACE_DEFAULT } from '@evoconn/components/animations/StarFieldBackground';
import { ClanCardFeedRimOverlay } from '@evoconn/components/ClanCardFeedRimOverlay';
import { getClanColor } from '@evoconn/constants/clanColors';
import {
  INSIGNIA_BOX_HEIGHT,
  INSIGNIA_BOX_OFFSET_X,
  INSIGNIA_BOX_OFFSET_Y,
  PROFILE_IDENTITY_SECTION_GAP,
  PROFILE_HEADER_AVATAR_ON_LEFT,
  computePersonalProfileTextInsetLeft,
  computePersonalProfileTextInsetRight,
} from '@evoconn/constants/personalProfileLayout';

/** Mismo radio y estilo de tarjeta que publicaciones recientes / feed Siguiendo. */
const CARD_RADIUS = 12;
const RIM_ARM = 44;
const RIM_INSET = 2;

type Props = {
  phrase: string;
  clanId: string | null;
  /** Al pulsar la frase se abre el editor (solo perfil personal). */
  onEdit?: () => void;
  /** Altura de la tarjeta (para centrar el avatar en el bloque conjunto). */
  onLayoutHeight?: (height: number) => void;
};

export const PersonalInsigniaPhrase = React.memo(function PersonalInsigniaPhrase({
  phrase,
  clanId,
  onEdit,
  onLayoutHeight,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const clanColor = getClanColor(clanId);

  const marginLeft = computePersonalProfileTextInsetLeft(screenW);
  const marginRight = computePersonalProfileTextInsetRight(screenW);
  const insigniaOffsetX = PROFILE_HEADER_AVATAR_ON_LEFT ? 0 : INSIGNIA_BOX_OFFSET_X;

  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const onCardLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setDims((prev) =>
        prev?.width === width && prev?.height === height ? prev : { width, height },
      );
      onLayoutHeight?.(height);
    },
    [onLayoutHeight],
  );

  const boxStyle = [
    styles.container,
    {
      marginLeft,
      marginRight,
      marginTop: PROFILE_IDENTITY_SECTION_GAP,
      transform: [{ translateX: insigniaOffsetX }, { translateY: INSIGNIA_BOX_OFFSET_Y }],
    },
    INSIGNIA_BOX_HEIGHT !== undefined && { height: INSIGNIA_BOX_HEIGHT },
  ];

  const content = (
    <>
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: CARD_RADIUS, overflow: 'hidden' }]}
        pointerEvents="none"
      >
        <PanelStarField surfaceColor={PANEL_STAR_SURFACE_DEFAULT} />
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
            borderRadius={CARD_RADIUS - RIM_INSET}
            clanColor={clanColor}
            rimArm={RIM_ARM}
          />
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.text}>{phrase}</Text>
      </View>
    </>
  );

  if (onEdit == null) {
    return (
      <View style={boxStyle} onLayout={onCardLayout}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={boxStyle}
      onLayout={onCardLayout}
      onPress={onEdit}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel="Editar frase insignia"
    >
      {content}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: CARD_RADIUS,
    minHeight: 68,
    overflow: 'hidden',
    backgroundColor: PANEL_STAR_SURFACE_DEFAULT,
  },
  content: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingVertical: 14,
    minHeight: 68,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  text: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
