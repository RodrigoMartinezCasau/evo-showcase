import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  SIDEBAR_COMMUNITY_LAYOUT as SC,
  resolveSidebarSinClanRim,
} from '@evoconn/constants/sidebarCommunityLayout';
import { SIDEBAR_NEW_REFLECTION_LAYOUT as SR } from '@evoconn/constants/sidebarNewReflectionLayout';
import { SIDEBAR_NEW_PHRASE_LAYOUT as SP } from '@evoconn/constants/sidebarNewPhraseLayout';
import { PanelStarField } from '@evoconn/components/animations/StarFieldBackground';
import { ClanCardFeedRimOverlay } from '@evoconn/components/ClanCardFeedRimOverlay';
import { evoconnColors } from '@evoconn/theme/colors';

/** Config normalizada: misma forma para COMUNIDAD, NUEVA REFLEXIÓN y NUEVA FRASE. */
export type SidebarPngMenuButtonConfig = {
  blockOffsetX: number;
  blockOffsetY: number;
  blockScale: number;
  imageWidth: number;
  imageHeight: number;
  buttonOffsetX: number;
  buttonOffsetY: number;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  horizontalStretch: number;
  textBoxWidth: number;
  textBoxHeight: number;
  textContainerOffsetX: number;
  textContainerOffsetY: number;
  textOffsetX: number;
  textOffsetY: number;
  textFontSize: number;
  textLetterSpacing: number;
};

type SidebarPngMenuButtonLeftOverlayBase = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Opcional; 1 por defecto. Escala desde el centro del rect del overlay. */
  scale?: number;
};

/** Capa opcional (p. ej. "+" en Nueva reflexión): coordenadas en el mismo espacio que el área visible recortada del botón. */
export type SidebarPngMenuButtonLeftOverlay =
  | (SidebarPngMenuButtonLeftOverlayBase & {
      source: ImageSourcePropType;
      element?: undefined;
    })
  | (SidebarPngMenuButtonLeftOverlayBase & {
      element: ReactNode;
      source?: undefined;
    });

export function getCommunityPngMenuConfig(): SidebarPngMenuButtonConfig {
  return {
    blockOffsetX: SC.SIDEBAR_COMMUNITY_BLOCK_OFFSET_X,
    blockOffsetY: SC.SIDEBAR_COMMUNITY_BLOCK_OFFSET_Y,
    blockScale: SC.SIDEBAR_COMMUNITY_BLOCK_SCALE,
    imageWidth: SC.SIDEBAR_COMMUNITY_BUTTON_WIDTH,
    imageHeight: SC.SIDEBAR_COMMUNITY_BUTTON_HEIGHT,
    buttonOffsetX: SC.SIDEBAR_COMMUNITY_BUTTON_OFFSET_X,
    buttonOffsetY: SC.SIDEBAR_COMMUNITY_BUTTON_OFFSET_Y,
    cropTop: SC.SIDEBAR_COMMUNITY_CROP_TOP,
    cropBottom: SC.SIDEBAR_COMMUNITY_CROP_BOTTOM,
    cropLeft: SC.SIDEBAR_COMMUNITY_CROP_LEFT,
    cropRight: SC.SIDEBAR_COMMUNITY_CROP_RIGHT,
    horizontalStretch: SC.SIDEBAR_COMMUNITY_HORIZONTAL_STRETCH,
    textBoxWidth: SC.SIDEBAR_COMMUNITY_TEXT_BOX_WIDTH,
    textBoxHeight: SC.SIDEBAR_COMMUNITY_TEXT_BOX_HEIGHT,
    textContainerOffsetX: SC.SIDEBAR_COMMUNITY_TEXT_CONTAINER_OFFSET_X,
    textContainerOffsetY: SC.SIDEBAR_COMMUNITY_TEXT_CONTAINER_OFFSET_Y,
    textOffsetX: SC.SIDEBAR_COMMUNITY_TEXT_OFFSET_X,
    textOffsetY: SC.SIDEBAR_COMMUNITY_TEXT_OFFSET_Y,
    textFontSize: SC.SIDEBAR_COMMUNITY_TEXT_FONT_SIZE,
    textLetterSpacing: SC.SIDEBAR_COMMUNITY_TEXT_LETTER_SPACING,
  };
}

export function getNewReflectionPngMenuConfig(): SidebarPngMenuButtonConfig {
  return {
    blockOffsetX: SR.SIDEBAR_NEW_REFLECTION_BLOCK_OFFSET_X,
    blockOffsetY: SR.SIDEBAR_NEW_REFLECTION_BLOCK_OFFSET_Y,
    blockScale: SR.SIDEBAR_NEW_REFLECTION_BLOCK_SCALE,
    imageWidth: SR.SIDEBAR_NEW_REFLECTION_IMAGE_WIDTH,
    imageHeight: SR.SIDEBAR_NEW_REFLECTION_IMAGE_HEIGHT,
    buttonOffsetX: SR.SIDEBAR_NEW_REFLECTION_BUTTON_OFFSET_X,
    buttonOffsetY: SR.SIDEBAR_NEW_REFLECTION_BUTTON_OFFSET_Y,
    cropTop: SR.SIDEBAR_NEW_REFLECTION_CROP_TOP,
    cropBottom: SR.SIDEBAR_NEW_REFLECTION_CROP_BOTTOM,
    cropLeft: SR.SIDEBAR_NEW_REFLECTION_CROP_LEFT,
    cropRight: SR.SIDEBAR_NEW_REFLECTION_CROP_RIGHT,
    horizontalStretch: SR.SIDEBAR_NEW_REFLECTION_HORIZONTAL_STRETCH,
    textBoxWidth: SR.SIDEBAR_NEW_REFLECTION_TEXT_BOX_WIDTH,
    textBoxHeight: SR.SIDEBAR_NEW_REFLECTION_TEXT_BOX_HEIGHT,
    textContainerOffsetX: SR.SIDEBAR_NEW_REFLECTION_TEXT_CONTAINER_OFFSET_X,
    textContainerOffsetY: SR.SIDEBAR_NEW_REFLECTION_TEXT_CONTAINER_OFFSET_Y,
    textOffsetX: SR.SIDEBAR_NEW_REFLECTION_TEXT_OFFSET_X,
    textOffsetY: SR.SIDEBAR_NEW_REFLECTION_TEXT_OFFSET_Y,
    textFontSize: SR.SIDEBAR_NEW_REFLECTION_TEXT_FONT_SIZE,
    textLetterSpacing: SR.SIDEBAR_NEW_REFLECTION_TEXT_LETTER_SPACING,
  };
}

export function getNewPhrasePngMenuConfig(): SidebarPngMenuButtonConfig {
  return {
    blockOffsetX: SP.SIDEBAR_NEW_PHRASE_BLOCK_OFFSET_X,
    blockOffsetY: SP.SIDEBAR_NEW_PHRASE_BLOCK_OFFSET_Y,
    blockScale: SP.SIDEBAR_NEW_PHRASE_BLOCK_SCALE,
    imageWidth: SP.SIDEBAR_NEW_PHRASE_IMAGE_WIDTH,
    imageHeight: SP.SIDEBAR_NEW_PHRASE_IMAGE_HEIGHT,
    buttonOffsetX: SP.SIDEBAR_NEW_PHRASE_BUTTON_OFFSET_X,
    buttonOffsetY: SP.SIDEBAR_NEW_PHRASE_BUTTON_OFFSET_Y,
    cropTop: SP.SIDEBAR_NEW_PHRASE_CROP_TOP,
    cropBottom: SP.SIDEBAR_NEW_PHRASE_CROP_BOTTOM,
    cropLeft: SP.SIDEBAR_NEW_PHRASE_CROP_LEFT,
    cropRight: SP.SIDEBAR_NEW_PHRASE_CROP_RIGHT,
    horizontalStretch: SP.SIDEBAR_NEW_PHRASE_HORIZONTAL_STRETCH,
    textBoxWidth: SP.SIDEBAR_NEW_PHRASE_TEXT_BOX_WIDTH,
    textBoxHeight: SP.SIDEBAR_NEW_PHRASE_TEXT_BOX_HEIGHT,
    textContainerOffsetX: SP.SIDEBAR_NEW_PHRASE_TEXT_CONTAINER_OFFSET_X,
    textContainerOffsetY: SP.SIDEBAR_NEW_PHRASE_TEXT_CONTAINER_OFFSET_Y,
    textOffsetX: SP.SIDEBAR_NEW_PHRASE_TEXT_OFFSET_X,
    textOffsetY: SP.SIDEBAR_NEW_PHRASE_TEXT_OFFSET_Y,
    textFontSize: SP.SIDEBAR_NEW_PHRASE_TEXT_FONT_SIZE,
    textLetterSpacing: SP.SIDEBAR_NEW_PHRASE_TEXT_LETTER_SPACING,
  };
}

type SidebarPngMenuButtonProps = {
  config: SidebarPngMenuButtonConfig;
  /** Ignorado cuando `communityRimColor` está definido. */
  source: ImageSourcePropType;
  label: string;
  accessibilityLabel: string;
  menuRowStyle: StyleProp<ViewStyle>;
  onPress: () => void;
  /**
   * Si es false, el tamaño del texto no se re-mide para encajar en la caja (solo `fontSize` fijo del config).
   * Evita saltos entre el primer frame y recargas/hot reload cuando `adjustsFontSizeToFit` dispara un segundo layout nativo.
   */
  textAdjustsFontSizeToFit?: boolean;
  leftOverlay?: SidebarPngMenuButtonLeftOverlay | null;
  /**
   * Botón COMUNIDAD: sustituye el PNG por fondo de app + destellos + reborde en este color.
   * Sin clan → verde lima; cada clan → su color principal.
   */
  communityRimColor?: string | null;
  /**
   * Pausa el parpadeo del campo de estrellas (solo aplica al botón COMUNIDAD).
   * Se usa para no animar 18 loops mientras el sidebar está cerrado/offscreen.
   */
  pauseStars?: boolean;
};

export function SidebarPngMenuButton({
  config,
  source,
  label,
  accessibilityLabel,
  menuRowStyle,
  onPress,
  textAdjustsFontSizeToFit = true,
  leftOverlay = null,
  communityRimColor = null,
  pauseStars = false,
}: SidebarPngMenuButtonProps) {
  const imgW = config.imageWidth;
  const imgH = config.imageHeight;
  const cropL = config.cropLeft;
  const cropR = config.cropRight;
  const cropT = config.cropTop;
  const cropB = config.cropBottom;
  const visibleW = Math.max(1, imgW - cropL - cropR);
  const visibleH = Math.max(1, imgH - cropT - cropB);
  const stretchH = config.horizontalStretch;
  const layoutW = Math.max(1, visibleW * stretchH);
  const textLeft =
    (layoutW - config.textBoxWidth) / 2 + config.textContainerOffsetX;
  const textTop =
    (visibleH - config.textBoxHeight) / 2 + config.textContainerOffsetY;

  const communityRim =
    communityRimColor != null && communityRimColor.trim() !== ''
      ? resolveSidebarSinClanRim(layoutW, visibleH)
      : null;
  const rimColor = communityRimColor?.trim() ?? '';

  return (
    <TouchableOpacity
      style={menuRowStyle}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={{
          transform: [
            { translateX: config.blockOffsetX },
            { translateY: config.blockOffsetY },
            { scale: config.blockScale },
          ],
        }}
      >
        <View
          style={{
            transform: [
              { translateX: config.buttonOffsetX },
              { translateY: config.buttonOffsetY },
            ],
          }}
        >
          <View style={{ position: 'relative', width: layoutW, height: visibleH, alignSelf: 'center' }}>
            {communityRim != null ? (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: communityRim.insetTop,
                  width: layoutW,
                  height: communityRim.bodyHeight,
                  borderRadius: communityRim.borderRadius,
                  overflow: 'hidden',
                  backgroundColor: evoconnColors.background,
                }}
              >
                <PanelStarField surfaceColor={evoconnColors.background} paused={pauseStars} />
                <ClanCardFeedRimOverlay
                  width={layoutW}
                  height={communityRim.bodyHeight}
                  borderRadius={communityRim.borderRadius}
                  clanColor={rimColor}
                  rimArmX={communityRim.rimArmX}
                  rimArmY={communityRim.rimArmY}
                />
              </View>
            ) : (
              /* Default PNG-based background */
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: layoutW,
                  height: visibleH,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: visibleW,
                    height: visibleH,
                    transform: [{ scaleX: stretchH }],
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: visibleW,
                      height: visibleH,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        left: -cropL,
                        top: -cropT,
                        width: imgW,
                        height: imgH,
                      }}
                    >
                      <Image
                        source={source}
                        style={{ width: imgW, height: imgH }}
                        resizeMode="stretch"
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}
            {leftOverlay != null ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: leftOverlay.x,
                  top: leftOverlay.y,
                  width: leftOverlay.width,
                  height: leftOverlay.height,
                  transform: [{ scale: leftOverlay.scale ?? 1 }],
                }}
              >
                {'source' in leftOverlay ? (
                  <Image
                    source={leftOverlay.source}
                    style={{ width: leftOverlay.width, height: leftOverlay.height }}
                    resizeMode="contain"
                  />
                ) : (
                  leftOverlay.element
                )}
              </View>
            ) : null}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: textLeft,
                top: textTop,
                width: config.textBoxWidth,
                height: config.textBoxHeight,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit={textAdjustsFontSizeToFit}
                minimumFontScale={textAdjustsFontSizeToFit ? 0.5 : 1}
                style={{
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: config.textFontSize,
                  letterSpacing: config.textLetterSpacing,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  maxWidth: config.textBoxWidth,
                  transform: [
                    { translateX: config.textOffsetX },
                    { translateY: config.textOffsetY },
                  ],
                }}
              >
                {label}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
