import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import type { CommunityPost } from '@evoconn/types';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { useFeedAudio } from '@evoconn/hooks/useFeedAudio';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE,
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID,
  COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID,
  COMMUNITY_DETAIL_PREFETCH_POSTS,
  COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID,
  COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID,
} from '@evoconn/constants/communityDetailFeed';

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
  /** Oculta @usuario en cada post (p. ej. visor desde perfil ajeno). */
  hideAuthorUsername?: boolean;
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
  hideAuthorUsername = false,
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
        hideAuthorUsername={hideAuthorUsername}
      />
    ),
    [itemHeight, onAuthorPress, onClanPress, handleReadingModeChange, hideAuthorUsername],
  );

  const feedAudio = useFeedAudio();
  const feedAudioRef = useRef(feedAudio);
  feedAudioRef.current = feedAudio;

  const verticalFeedVisiblePostIdRef = useRef<string | null>(null);
  const verticalFeedViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onVerticalFeedViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: CommunityPost }> }) => {
      const post = viewableItems[0]?.item;
      if (!post?.id) return;
      const prev = verticalFeedVisiblePostIdRef.current;
      verticalFeedVisiblePostIdRef.current = post.id;
      if (prev !== null && prev !== post.id) {
        Keyboard.dismiss();
      }
      // Audio adjunto del post visible (volumen elegido al publicar).
      feedAudioRef.current.playForPost(post);
    },
  ).current;

  // Arrancar el audio del post inicial (onViewableItemsChanged no siempre
  // dispara para el primer item ya visible en el montaje).
  const initialAudioPlayedRef = useRef(false);
  useEffect(() => {
    if (initialAudioPlayedRef.current) return;
    if (data.length === 0) return;
    const post = data[Math.min(initialIndex, data.length - 1)];
    if (post) {
      initialAudioPlayedRef.current = true;
      feedAudioRef.current.playForPost(post);
    }
  }, [data, initialIndex]);

  // Detener el audio al cerrar el panel (desmontar).
  useEffect(() => () => feedAudioRef.current.stop(), []);

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
            nestedScrollEnabled
            scrollEnabled={feedScrollEnabled}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex}
            initialNumToRender={Platform.OS === 'android' ? COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID : COMMUNITY_DETAIL_PREFETCH_POSTS}
            maxToRenderPerBatch={Platform.OS === 'android' ? COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID : COMMUNITY_DETAIL_PREFETCH_POSTS}
            updateCellsBatchingPeriod={Platform.OS === 'android' ? COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID : 50}
            windowSize={Platform.OS === 'android' ? COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID : COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE}
            removeClippedSubviews
            style={styles.list}
            viewabilityConfig={verticalFeedViewabilityConfig}
            onViewableItemsChanged={onVerticalFeedViewableItemsChanged}
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
