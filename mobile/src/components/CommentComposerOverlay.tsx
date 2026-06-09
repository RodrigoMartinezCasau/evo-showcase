import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHAT_INPUT_ISLAND_LAYOUT as ISLAND } from '@evoconn/constants/chatInputBarLayout';
import { COMMENT_COMPOSER_KEYBOARD_LAYOUT as KB } from '@evoconn/constants/newCommentBoxLayout';
import { useKeyboardAnim } from './ChatInputBar';

type CommentComposerOverlayProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Horizontal inset from screen edges (matches comment panel padding). */
  contentPaddingHorizontal?: number;
  /** Disparado cuando el Modal queda presentado (foco fiable en Android). */
  onShow?: () => void;
};

/** Evita que el mismo tap que abrió el modal dispare el cierre del backdrop. */
const DISMISS_ARM_DELAY_MS = 320;

/**
 * Modal + barra anclada abajo.
 *
 * iOS: el Modal NO redimensiona la ventana → movemos la barra con `translateY`
 *      (igual que `ChatInputBar`).
 * Android: `adjustResize` YA redimensiona la ventana del Modal → la barra queda
 *          pegada al teclado si NO aplicamos otra `translateY` (doble salto).
 */
export function CommentComposerOverlay({
  visible,
  onClose,
  children,
  contentPaddingHorizontal = 0,
  onShow,
}: CommentComposerOverlayProps) {
  const insets = useSafeAreaInsets();
  const keyboardAnim = useKeyboardAnim();
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
    const focus = () => onShow?.();
    focus();
    requestAnimationFrame(focus);
    setTimeout(focus, 48);
    setTimeout(focus, 120);
  };

  const keyboardGapOffset = keyboardAnim.interpolate({
    inputRange: [0, ISLAND.keyboardBubbleGapBlendPx],
    outputRange: [0, ISLAND.keyboardBubbleGapOffsetY],
    extrapolate: 'clamp',
  });
  const keyboardExtraLift = keyboardAnim.interpolate({
    inputRange: [0, KB.keyboardBubbleGapBlendPx],
    outputRange: [0, KB.keyboardExtraLiftOffsetY],
    extrapolate: 'clamp',
  });
  const keyboardIosHomeLift = keyboardAnim.interpolate({
    inputRange: [0, KB.keyboardBubbleGapBlendPx],
    outputRange: [0, insets.bottom * KB.keyboardIosHomeIndicatorLiftRatio],
    extrapolate: 'clamp',
  });

  const iosTranslateY = Animated.add(
    Animated.multiply(keyboardAnim, -1),
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

  const barInner = (
    <View pointerEvents="auto" style={styles.content}>
      {children}
    </View>
  );

  const barWrapperStyle = [
    styles.outerWrapper,
    contentPaddingHorizontal > 0 && {
      paddingHorizontal: contentPaddingHorizontal,
    },
    Platform.OS === 'android' && [
      styles.androidBarDock,
      { paddingBottom: Math.max(insets.bottom, KB.contentPaddingBottom) },
    ],
  ] as const;

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
            collapsable={false}
            pointerEvents="box-none"
            style={[...barWrapperStyle, { transform: [{ translateY: iosTranslateY }] }]}
          >
            {barInner}
          </Animated.View>
        ) : (
          <View collapsable={false} pointerEvents="box-none" style={barWrapperStyle}>
            {barInner}
          </View>
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
  androidBarDock: {
    backgroundColor: '#0b0b0f',
  },
  content: {
    paddingTop: KB.contentPaddingTop,
    paddingBottom: Platform.OS === 'ios' ? KB.contentPaddingBottom : 0,
  },
});
