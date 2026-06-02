import React, { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react';
import { View, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { evoconnColors } from '@evoconn/theme/colors';

const DISMISS_DY = 72;
const DISMISS_VY = 900;

export type CommentsSheetHandle = {
  close: () => void;
};

type CommentsSheetProps = {
  mounted: boolean;
  active: boolean;
  sheetHeight: number;
  containerHeight: number;
  onClose: () => void;
  header: React.ReactNode;
  list: React.ReactNode;
  footer: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
};

/**
 * Hoja de comentarios con gesto de cierre en el hilo de UI (Reanimated).
 * Sin setState durante el pan: solo atenúa la lista, no la desmonta.
 */
export const CommentsSheet = forwardRef<CommentsSheetHandle, CommentsSheetProps>(
  function CommentsSheet(
    {
      mounted,
      active,
      sheetHeight,
      containerHeight,
      onClose,
      header,
      list,
      footer,
      sheetStyle,
    },
    ref,
  ) {
    const translateY = useSharedValue(sheetHeight);
    const sheetHeightSv = useSharedValue(sheetHeight);

    useEffect(() => {
      sheetHeightSv.value = sheetHeight;
      if (!mounted) {
        translateY.value = sheetHeight;
        return;
      }
      if (active) {
        translateY.value = 0;
      }
    }, [mounted, active, sheetHeight, sheetHeightSv, translateY]);

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const runClose = () => {
      onCloseRef.current();
    };

    const animateClose = (durationMs: number) => {
      const h = sheetHeightSv.value;
      translateY.value = withTiming(h, { duration: durationMs }, (finished) => {
        if (finished) runOnJS(runClose)();
      });
    };

    useImperativeHandle(ref, () => ({
      close: () => animateClose(200),
    }));

    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .activeOffsetY(10)
          .failOffsetX([-28, 28])
          .onUpdate((e) => {
            'worklet';
            const h = sheetHeightSv.value;
            translateY.value = Math.max(0, Math.min(e.translationY, h));
          })
          .onEnd((e) => {
            'worklet';
            if (e.translationY > DISMISS_DY || e.velocityY > DISMISS_VY) {
              const h = sheetHeightSv.value;
              translateY.value = withTiming(h, { duration: 180 }, (finished) => {
                if (finished) runOnJS(runClose)();
              });
            } else {
              translateY.value = withSpring(0, { damping: 22, stiffness: 280 });
            }
          }),
      [sheetHeightSv, translateY],
    );

    const backdropStyle = useAnimatedStyle(() => {
      const h = Math.max(sheetHeightSv.value, 1);
      return {
        opacity: interpolate(
          translateY.value,
          [0, h],
          [1, 0],
          Extrapolation.CLAMP,
        ),
      };
    });

    const sheetAnimStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const listFadeStyle = useAnimatedStyle(() => ({
      opacity: interpolate(translateY.value, [0, 48], [1, 0], Extrapolation.CLAMP),
    }));

    if (!mounted) return null;

    return (
      <View
        style={[styles.root, { height: containerHeight }]}
        pointerEvents={active ? 'auto' : 'none'}
      >
        <Pressable
          style={styles.dismissZone}
          onPress={() => animateClose(200)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar comentarios"
        >
          <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            { height: sheetHeight },
            sheetAnimStyle,
            sheetStyle,
          ]}
        >
          {/* Pan solo en la cabecera: la FlatList conserva el scroll nativo. */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={styles.dragHeader}>{header}</Animated.View>
          </GestureDetector>
          <Animated.View style={[styles.listClip, listFadeStyle]}>{list}</Animated.View>
          {footer}
        </Animated.View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  dismissZone: {
    flex: 1,
    width: '100%',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: evoconnColors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  /** Zona de arrastre (handle + cerrar); el scroll vive debajo, sin gesto pan. */
  dragHeader: {
    paddingBottom: 6,
    minHeight: 44,
  },
  listClip: {
    flex: 1,
    overflow: 'hidden',
  },
});
