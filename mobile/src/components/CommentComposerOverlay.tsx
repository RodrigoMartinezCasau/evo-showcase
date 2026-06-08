import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
  Keyboard,
  Dimensions,
  InteractionManager,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHAT_INPUT_ISLAND_LAYOUT as ISLAND } from '@evoconn/constants/chatInputBarLayout';
import { COMMENT_COMPOSER_KEYBOARD_LAYOUT as KB } from '@evoconn/constants/newCommentBoxLayout';

type CommentComposerOverlayProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Horizontal inset from screen edges (matches comment panel padding). */
  contentPaddingHorizontal?: number;
  /** Disparado cuando el Modal queda presentado (foco fiable en Android). */
  onShow?: () => void;
};

/** iOS: altura del teclado desde el borde inferior de ventana. */
function resolveIosKeyboardHeight(e: KeyboardEvent): number {
  const windowHeight = Dimensions.get('window').height;
  return Math.max(0, windowHeight - e.endCoordinates.screenY);
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

/** Evita que el mismo tap que abrió el modal dispare el cierre del backdrop. */
const DISMISS_ARM_DELAY_MS = 320;

/**
 *
 * iOS: animación de altura de teclado (igual que ChatInputBar).
 * Android: sin traslación manual — `adjustResize` redimensiona la ventana del
 * Modal y la barra queda pegada al teclado. Moverla otra vez la empuja lejos.
 */
export function CommentComposerOverlay({
  visible,
  onClose,
  children,
  contentPaddingHorizontal = 0,
  onShow,
}: CommentComposerOverlayProps) {
  const insets = useSafeAreaInsets();
  const iosKeyboardAnim = useIosCommentComposerKeyboardAnim(visible);
  const [dismissArmed, setDismissArmed] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDismissArmed(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setDismissArmed(true);
    }, DISMISS_ARM_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible]);

  const handleModalShow = () => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => onShow?.());
    });
  };

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

  const iosTranslateY = Animated.add(
    Animated.multiply(iosKeyboardAnim, -1),
    Animated.subtract(
      keyboardGapOffset,
      Animated.add(keyboardExtraLift, keyboardIosHomeLift),
    ),
  );

  const handleDismiss = () => {
    if (!dismissArmed) return;
    Keyboard.dismiss();
    onClose();
  };

  const barWrapper = visible ? (
    <View
      collapsable={false}
      pointerEvents="box-none"
      style={[
        styles.outerWrapper,
        contentPaddingHorizontal > 0 && {
          paddingHorizontal: contentPaddingHorizontal,
        },
        Platform.OS === 'android' && [
          styles.androidBarDock,
          { paddingBottom: Math.max(insets.bottom, KB.contentPaddingBottom) },
        ],
      ]}
    >
      <View pointerEvents="auto" style={styles.content}>
        {children}
      </View>
    </View>
  ) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={handleModalShow}
      onRequestClose={handleDismiss}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={styles.dismiss}
          onPress={handleDismiss}
          disabled={!dismissArmed}
          pointerEvents={dismissArmed ? 'auto' : 'none'}
        />
        {Platform.OS === 'ios' ? (
          <Animated.View
            pointerEvents="box-none"
            style={{ transform: [{ translateY: iosTranslateY }] }}
          >
            {barWrapper}
          </Animated.View>
        ) : (
          barWrapper
        )}
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
  /** Fondo sólido para que no se vea contenido del feed entre barra y teclado. */
  androidBarDock: {
    backgroundColor: '#0b0b0f',
  },
  content: {
    paddingTop: KB.contentPaddingTop,
    paddingBottom: Platform.OS === 'ios' ? KB.contentPaddingBottom : 0,
  },
});
