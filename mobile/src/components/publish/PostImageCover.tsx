import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Platform,
  PanResponder,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  computePostImageCoverLayout,
  DEFAULT_POST_IMAGE_FOCUS_Y,
  postImageFocusYFromPanDelta,
  type PostImageFocusY,
} from '@evoconn/utils/postImageCoverLayout';
import { DETAIL_PHOTO_IMAGE_BORDER_RADIUS } from '@evoconn/constants/reflectionDetailPhotoLayout';

type Props = {
  uri: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  focusY?: PostImageFocusY | null;
  contentTopInset?: number;
  surfaceColor?: string;
  scrimOpacity?: number;
  imageBorderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** Modo editor: arrastre vertical exclusivo + vista borrosa fuera del marco. */
  interactive?: boolean;
  onFocusYChange?: (focusY: PostImageFocusY) => void;
  /** Quita la foto solo del display actual (editor de encuadre). */
  onRemoveFromDisplay?: () => void;
};

/**
 * Fondo de foto con encuadre cover universal (`focusY` en espacio de imagen).
 */
export function PostImageCover({
  uri,
  imageWidth,
  imageHeight,
  focusY,
  contentTopInset = 0,
  surfaceColor = '#000000',
  scrimOpacity = 0.4,
  imageBorderRadius = DETAIL_PHOTO_IMAGE_BORDER_RADIUS,
  style,
  interactive = false,
  onFocusYChange,
  onRemoveFromDisplay,
}: Props) {
  const [frameW, setFrameW] = React.useState(0);
  const [frameH, setFrameH] = React.useState(0);
  const panStartFocusY = useRef(DEFAULT_POST_IMAGE_FOCUS_Y);
  const focusYRef = useRef(DEFAULT_POST_IMAGE_FOCUS_Y);
  const scaledHRef = useRef(1);
  const onFocusYChangeRef = useRef(onFocusYChange);

  const iw = imageWidth && imageWidth > 0 ? imageWidth : 1280;
  const ih = imageHeight && imageHeight > 0 ? imageHeight : 1280;
  const fy = focusY ?? DEFAULT_POST_IMAGE_FOCUS_Y;

  useEffect(() => {
    focusYRef.current = fy;
  }, [fy]);

  useEffect(() => {
    onFocusYChangeRef.current = onFocusYChange;
  }, [onFocusYChange]);

  const photoZoneH = Math.max(0, frameH - contentTopInset);

  const cover = useMemo(
    () =>
      computePostImageCoverLayout({
        containerWidth: frameW,
        containerHeight: photoZoneH,
        imageWidth: iw,
        imageHeight: ih,
        focusY: fy,
      }),
    [frameW, photoZoneH, iw, ih, fy],
  );

  scaledHRef.current = cover.imageHeight;

  const applyPan = (translationY: number) => {
    onFocusYChangeRef.current?.(
      postImageFocusYFromPanDelta(
        panStartFocusY.current,
        translationY,
        scaledHRef.current,
      ),
    );
  };

  const panResponder = useMemo(() => {
    if (!interactive) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dy) >= Math.abs(gs.dx),
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dy) > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        panStartFocusY.current = focusYRef.current;
      },
      onPanResponderMove: (_, gs) => {
        applyPan(gs.dy);
      },
    });
  }, [interactive]);

  const imageStyle = {
    position: 'absolute' as const,
    width: cover.imageWidth,
    height: cover.imageHeight,
    left: cover.left,
    top: cover.top,
  };

  const photoZoneOuter = {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: contentTopInset,
    bottom: 0,
  };

  const photoZoneClip = {
    ...photoZoneOuter,
    overflow: 'hidden' as const,
    borderRadius: imageBorderRadius,
  };

  const renderPhotoZone = () => {
    if (frameW <= 0 || photoZoneH <= 0) return null;

    if (interactive) {
      return (
        <>
          <View
            style={[photoZoneOuter, { overflow: 'visible', zIndex: 0 }]}
            pointerEvents="none"
          >
            <Image
              source={{ uri }}
              style={[
                imageStyle,
                {
                  opacity: Platform.OS === 'ios' ? 0.42 : 0.28,
                  ...(Platform.OS === 'ios' ? { blurRadius: 16 } : {}),
                },
              ]}
            />
          </View>
          <View style={[photoZoneClip, { zIndex: 1 }]} pointerEvents="none">
            <Image source={{ uri }} style={imageStyle} />
          </View>
          <View
            style={[photoZoneClip, styles.interactivePanLayer]}
            collapsable={false}
            {...(panResponder?.panHandlers ?? {})}
          />
          {onRemoveFromDisplay ? (
            <View
              style={[photoZoneClip, styles.removeDisplayHost]}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                style={styles.removeDisplayTap}
                onPress={onRemoveFromDisplay}
                hitSlop={12}
                accessibilityLabel="Quitar foto de este display"
              >
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      );
    }

    return (
      <View style={photoZoneClip}>
        <Image source={{ uri }} resizeMode="cover" style={imageStyle} />
      </View>
    );
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents={interactive ? 'box-none' : 'none'}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setFrameW(width);
        setFrameH(height);
      }}
    >
      {contentTopInset > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: contentTopInset,
            backgroundColor: surfaceColor,
            zIndex: interactive ? 0 : 3,
          }}
        />
      ) : null}
      {renderPhotoZone()}
      {scrimOpacity > 0 ? (
        <View
          pointerEvents="none"
          style={[
            photoZoneClip,
            {
              backgroundColor: `rgba(0,0,0,${scrimOpacity})`,
              zIndex: interactive ? 1 : undefined,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  interactivePanLayer: {
    zIndex: 25,
    backgroundColor: 'transparent',
  },
  removeDisplayHost: {
    zIndex: 30,
    overflow: 'visible',
  },
  removeDisplayTap: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    padding: 4,
  },
});
