import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
  Keyboard,
  Dimensions,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHAT_INPUT_ISLAND_LAYOUT as ISLAND } from '@evoconn/constants/chatInputBarLayout';
import { COMMENT_COMPOSER_KEYBOARD_LAYOUT as KB } from '@evoconn/constants/newCommentBoxLayout';

const DEFAULT_ANDROID_MEASURE_RETRY_MS = [48, 120, 240] as const;

type CommentComposerOverlayProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Horizontal inset from screen edges (matches comment panel padding). */
  contentPaddingHorizontal?: number;
};

/** iOS: altura del teclado desde el borde inferior de ventana. */
function resolveIosKeyboardHeight(e: KeyboardEvent): number {
  const windowHeight = Dimensions.get('window').height;
  return Math.max(0, windowHeight - e.endCoordinates.screenY);
}

/**
 * Android: borde superior del teclado en coordenadas de pantalla.
 * OEMs mezclan `screenY` y `height`; elegimos la estimación más fiable.
 */
function resolveAndroidKeyboardTopY(
  end: { screenY: number; height?: number },
  windowHeight: number,
): number {
  if (!Number.isFinite(windowHeight) || windowHeight < 120) {
    return end.screenY > 0 ? end.screenY : 0;
  }
  const h = end.height ?? 0;
  const { screenY } = end;
  if (h > 0) {
    const fromHeight = windowHeight - h;
    const tolerance = Math.max(64, windowHeight * 0.15);
    const plausible =
      screenY > 40 &&
      screenY < windowHeight - 24 &&
      Math.abs(screenY - fromHeight) < tolerance;
    if (plausible) {
      return Math.min(fromHeight, screenY);
    }
    return fromHeight;
  }
  if (screenY > 40 && screenY < windowHeight - 24) {
    return screenY;
  }
  return windowHeight;
}

function useIosCommentComposerKeyboardAnim(active: boolean) {
  const anim = useRef(new Animated.Value(0)).current;
  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    if (!active || Platform.OS !== 'ios') {
      anim.stopAnimation();
      anim.setValue(0);
      keyboardHeightRef.current = 0;
      return;
    }

    const animateToKeyboardFrame = (e: KeyboardEvent) => {
      const keyboardHeight = resolveIosKeyboardHeight(e);
      const isOpening = keyboardHeight > keyboardHeightRef.current;
      const speed = isOpening ? ISLAND.keyboardOpenSpeed : ISLAND.keyboardCloseSpeed;
      const baseDuration = e.duration ?? 250;
      const duration = Math.max(ISLAND.keyboardMinDurationMs, baseDuration / speed);

      anim.stopAnimation();
      keyboardHeightRef.current = keyboardHeight;
      Animated.timing(anim, {
        toValue: keyboardHeight,
        duration,
        useNativeDriver: true,
      }).start();
    };

    const onFrameChange = Keyboard.addListener(
      'keyboardWillChangeFrame',
      animateToKeyboardFrame,
    );
    return () => onFrameChange.remove();
  }, [active, anim]);

  return anim;
}

/**
 * Android: mide la barra en pantalla y la coloca justo encima del teclado
 * (sin estimar altura fija — evita que quede demasiado arriba con adjustResize).
 */
function useAndroidCommentComposerKeyboardOffset(
  active: boolean,
  measureRef: React.RefObject<View | null>,
  insetBottom: number,
) {
  const offset = useRef(new Animated.Value(0)).current;
  const lastKbTopRef = useRef<number | null>(null);
  const retryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearRetries = useCallback(() => {
    const timers = retryTimersRef.current;
    if (Array.isArray(timers)) {
      timers.forEach(clearTimeout);
    }
    retryTimersRef.current = [];
  }, []);

  const applyMeasuredOffset = useCallback(
    (kbTopY: number, duration = KB.keyboardAndroidAnimateDurationMs) => {
      measureRef.current?.measureInWindow((_x, y, _w, h) => {
        if (h <= 0) return;

        const barBottom = y + h;
        const overlap = barBottom - kbTopY;
        const cushion =
          KB.keyboardAndroidOverlapCushionPx +
          insetBottom * KB.keyboardAndroidNavInsetCushionRatio;

        let target: number;
        if (overlap > 0) {
          // La barra invade el teclado → subir.
          target = -(overlap + cushion);
        } else {
          // La barra ya está por encima → bajar solo el exceso + ajuste fino.
          target = -overlap + KB.keyboardAndroidFineTuneDownPx;
        }
        target += KB.keyboardAndroidGlobalTranslateNudgeY;

        offset.stopAnimation();
        Animated.timing(offset, {
          toValue: target,
          duration,
          useNativeDriver: true,
        }).start();
      });
    },
    [insetBottom, measureRef, offset],
  );

  const scheduleMeasurePasses = useCallback(
    (kbTopY: number, duration = KB.keyboardAndroidAnimateDurationMs) => {
      clearRetries();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => applyMeasuredOffset(kbTopY, duration));
      });
      const retryDelays = Array.isArray(KB.keyboardAndroidMeasureRetryMs)
        ? KB.keyboardAndroidMeasureRetryMs
        : DEFAULT_ANDROID_MEASURE_RETRY_MS;
      retryDelays.forEach((delayMs) => {
        const timer = setTimeout(() => applyMeasuredOffset(kbTopY, duration), delayMs);
        retryTimersRef.current.push(timer);
      });
    },
    [applyMeasuredOffset, clearRetries],
  );

  useEffect(() => {
    if (!active || Platform.OS !== 'android') {
      clearRetries();
      offset.stopAnimation();
      offset.setValue(0);
      lastKbTopRef.current = null;
      return;
    }

    const onShow = (e: KeyboardEvent) => {
      const winH = Dimensions.get('window').height;
      const kbTopY = resolveAndroidKeyboardTopY(e.endCoordinates, winH);
      lastKbTopRef.current = kbTopY;
      scheduleMeasurePasses(kbTopY);
    };

    const onHide = () => {
      clearRetries();
      lastKbTopRef.current = null;
      offset.stopAnimation();
      Animated.timing(offset, {
        toValue: 0,
        duration: KB.keyboardAndroidAnimateDurationMs,
        useNativeDriver: true,
      }).start();
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
      clearRetries();
    };
  }, [active, clearRetries, offset, scheduleMeasurePasses]);

  return offset;
}

/**
 * Modal a nivel de pantalla + barra anclada abajo.
 * iOS: mismo workflow que ChatInputBar (altura de teclado animada).
 * Android: medición real barra ↔ teclado para quedar justo encima.
 */
export function CommentComposerOverlay({
  visible,
  onClose,
  children,
  contentPaddingHorizontal = 0,
}: CommentComposerOverlayProps) {
  const insets = useSafeAreaInsets();
  const barMeasureRef = useRef<View | null>(null);

  const iosKeyboardAnim = useIosCommentComposerKeyboardAnim(visible);
  const androidKeyboardOffset = useAndroidCommentComposerKeyboardOffset(
    visible,
    barMeasureRef,
    insets.bottom,
  );

  const keyboardGapOffset = iosKeyboardAnim.interpolate({
    inputRange: [0, KB.keyboardBubbleGapBlendPx],
    outputRange: [0, KB.keyboardBubbleGapOffsetY],
    extrapolate: 'clamp',
  });
  const keyboardExtraLift = iosKeyboardAnim.interpolate({
    inputRange: [0, KB.keyboardBubbleGapBlendPx],
    outputRange: [0, KB.keyboardExtraLiftOffsetY],
    extrapolate: 'clamp',
  });
  const keyboardIosHomeLift = iosKeyboardAnim.interpolate({
    inputRange: [0, KB.keyboardBubbleGapBlendPx],
    outputRange: [0, insets.bottom * KB.keyboardIosHomeIndicatorLiftRatio],
    extrapolate: 'clamp',
  });
  const iosTranslateY =
    Platform.OS === 'ios'
      ? Animated.add(
          Animated.multiply(iosKeyboardAnim, -1),
          Animated.subtract(
            keyboardGapOffset,
            Animated.add(keyboardExtraLift, keyboardIosHomeLift),
          ),
        )
      : androidKeyboardOffset;

  const handleDismiss = () => {
    Keyboard.dismiss();
    onClose();
  };

  const androidBottom =
    insets.bottom + KB.keyboardAndroidWrapperBottomOffsetY;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable style={styles.dismiss} onPress={handleDismiss} />
        <Animated.View
          ref={barMeasureRef}
          collapsable={false}
          pointerEvents="box-none"
          style={[
            styles.outerWrapper,
            Platform.OS === 'android' && { bottom: androidBottom },
            contentPaddingHorizontal > 0 && {
              paddingHorizontal: contentPaddingHorizontal,
            },
            { transform: [{ translateY: iosTranslateY }] },
          ]}
        >
          <View pointerEvents="auto" style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  outerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  content: {
    paddingTop: KB.contentPaddingTop,
    paddingBottom: KB.contentPaddingBottom,
  },
});
