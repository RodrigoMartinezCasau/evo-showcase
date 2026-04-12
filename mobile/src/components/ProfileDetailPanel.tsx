import React, { useCallback, useState, useMemo } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import type { CommunityPost } from '@evoconn/types';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { evoconnColors } from '@evoconn/theme/colors';

type Props = {
  data: CommunityPost[];
  initialIndex: number;
  /** Height of each paged item — equals the middle content area height. */
  itemHeight: number;
  /** Animated.Value driven by the parent (0 = hidden off-right, 1 = fully visible). */
  slideAnim: Animated.Value;
  screenW: number;
  onClose: () => void;
  onAuthorPress: (userId: string) => void;
  onClanPress: (clanId: string) => void;
};

const SPRING_CONFIG = { friction: 9, tension: 68, useNativeDriver: true } as const;
const CLOSE_VELOCITY_THRESHOLD = 400;
const CLOSE_PROGRESS_THRESHOLD = 0.5;

export function ProfileDetailPanel({
  data,
  initialIndex,
  itemHeight,
  slideAnim,
  screenW,
  onClose,
  onAuthorPress,
  onClanPress,
}: Props) {
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenW, 0],
  });

  // ─── Swipe-back gesture helpers (called from JS worklet via runOnJS) ─
  const setSlideProgress = useCallback(
    (p: number) => { slideAnim.setValue(p); },
    [slideAnim],
  );

  const cancelClose = useCallback(() => {
    Animated.spring(slideAnim, { toValue: 1, ...SPRING_CONFIG }).start();
  }, [slideAnim]);

  // ─── Swipe-right-to-close gesture ────────────────────────────────────
  const swipeBackGesture = useMemo(
    () =>
      Gesture.Pan()
        // Activate on clear horizontal intent; fail on vertical scroll
        .activeOffsetX(12)
        .failOffsetY([-32, 32])
        .onUpdate((e: { translationX: number }) => {
          // translationX > 0 means user is swiping right → reduce progress
          const p = Math.max(0, Math.min(1, 1 - e.translationX / screenW));
          runOnJS(setSlideProgress)(p);
        })
        .onEnd((e: { translationX: number; velocityX: number }) => {
          const p = Math.max(0, Math.min(1, 1 - e.translationX / screenW));
          const shouldClose = p < CLOSE_PROGRESS_THRESHOLD || e.velocityX > CLOSE_VELOCITY_THRESHOLD;
          if (shouldClose) {
            runOnJS(onClose)();   // parent animates slideAnim → 0 then unmounts
          } else {
            runOnJS(cancelClose)();
          }
        }),
    [screenW, setSlideProgress, onClose, cancelClose],
  );

  // ─── List helpers ────────────────────────────────────────────────────
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight],
  );

  const handleReadingModeChange = useCallback((active: boolean) => {
    setFeedScrollEnabled(!active);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <ReflectionDetailItem
        post={item}
        itemHeight={itemHeight}
        onAuthorPress={onAuthorPress}
        onClanPress={onClanPress}
        onReadingModeChange={handleReadingModeChange}
      />
    ),
    [itemHeight, onAuthorPress, onClanPress, handleReadingModeChange],
  );

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFillObject}>
      <GestureDetector gesture={swipeBackGesture}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.panel,
            { transform: [{ translateX }] },
          ]}
        >
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            pagingEnabled
            scrollEnabled={feedScrollEnabled}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={3}
            removeClippedSubviews
            style={styles.list}
          />
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: evoconnColors.background,
    zIndex: 10,
  },
  list: { flex: 1 },
});
