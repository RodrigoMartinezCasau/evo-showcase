import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { PROFILE_TESTER_BADGE_SIZE } from '@evoconn/constants/personalProfileLayout';
import { useIsFirstHundredUser } from '@evoconn/hooks/useIsFirstHundredUser';
import TestersIcon from '../../assets/profile/testers2.svg';

const POPUP_MESSAGE = 'Certificado de 100 primeros usuarios de la app';
const BUBBLE_GAP = 8;
const BUBBLE_MAX_WIDTH = 260;
const SCREEN_EDGE_PAD = 12;

type AnchorRect = { x: number; y: number; w: number; h: number };

type Props = {
  userId: string;
  /** Tamaño del icono en px (por defecto 80 % más pequeño que ↗). */
  iconSize?: number;
};

export function FirstUsersTesterBadge({ userId, iconSize = PROFILE_TESTER_BADGE_SIZE }: Props) {
  const isFounding = useIsFirstHundredUser(userId);
  const [popupOpen, setPopupOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(0);
  const anchorRef = useRef<View>(null);
  const { width: screenW } = useWindowDimensions();

  const openPopup = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, w: width, h: height });
      setPopupOpen(true);
    });
  }, []);

  const closePopup = useCallback(() => {
    setPopupOpen(false);
    setAnchor(null);
  }, []);

  if (!isFounding) return null;

  const bubbleLeft =
    anchor != null
      ? Math.min(
          anchor.x + anchor.w + BUBBLE_GAP,
          screenW - BUBBLE_MAX_WIDTH - SCREEN_EDGE_PAD,
        )
      : 0;
  const bubbleTop =
    anchor != null && bubbleHeight > 0
      ? anchor.y + anchor.h / 2 - bubbleHeight / 2
      : anchor?.y ?? 0;

  return (
    <>
      <View ref={anchorRef} collapsable={false} style={styles.iconHit}>
        <Pressable
          onPress={openPopup}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={POPUP_MESSAGE}
        >
          <TestersIcon width={iconSize} height={iconSize} />
        </Pressable>
      </View>

      <Modal visible={popupOpen} transparent animationType="fade" onRequestClose={closePopup}>
        <Pressable style={styles.backdrop} onPress={closePopup}>
          {anchor != null ? (
            <Pressable
              style={[
                styles.bubble,
                {
                  position: 'absolute',
                  left: bubbleLeft,
                  top: bubbleTop,
                  maxWidth: BUBBLE_MAX_WIDTH,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
              onLayout={(e) => setBubbleHeight(e.nativeEvent.layout.height)}
            >
              <Text style={styles.bubbleText}>{POPUP_MESSAGE}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconHit: {
    marginLeft: 5,
    flexShrink: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bubble: {
    backgroundColor: 'rgba(18,18,22,0.96)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
    fontWeight: '600',
  },
});
