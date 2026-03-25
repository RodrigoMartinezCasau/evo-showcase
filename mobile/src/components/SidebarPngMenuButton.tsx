import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SIDEBAR_COMMUNITY_LAYOUT as SC } from '@evoconn/constants/sidebarCommunityLayout';
import { SIDEBAR_NEW_REFLECTION_LAYOUT as SR } from '@evoconn/constants/sidebarNewReflectionLayout';

/** Config normalizada: misma forma para COMUNIDAD y NUEVA REFLEXIÓN. */
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

type SidebarPngMenuButtonProps = {
  config: SidebarPngMenuButtonConfig;
  source: ImageSourcePropType;
  label: string;
  accessibilityLabel: string;
  menuRowStyle: StyleProp<ViewStyle>;
  onPress: () => void;
};

export function SidebarPngMenuButton({
  config,
  source,
  label,
  accessibilityLabel,
  menuRowStyle,
  onPress,
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
                adjustsFontSizeToFit
                minimumFontScale={0.5}
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
