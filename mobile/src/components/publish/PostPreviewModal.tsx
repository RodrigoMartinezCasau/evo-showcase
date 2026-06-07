import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import {
  COMMUNITY_FEED_LIST_PADDING_TOP,
  computeCommunityFeedSlotHeights,
} from '@evoconn/constants/communityFeedSlotLayout';
import { useFeedAudio } from '@evoconn/hooks/useFeedAudio';
import { ReflectionDetailItem } from '../ReflectionDetailItem';
import { CommunityPostCard } from '../CommunityPostCard';

type Props = {
  visible: boolean;
  post: CommunityPost | null;
  onClose: () => void;
};

const HEADER_HEIGHT = 52;
const DOT = 6;

/**
 * Vista previa deslizable: Para ti ↔ Siguiendo. Indicador = dos puntos (color clan).
 */
export function PostPreviewModal({ visible, post, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { width: screenW, height } = useWindowDimensions();
  const audio = useFeedAudio();
  const pagerRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const clanColor = getClanColor(post?.author.clanId ?? null);

  useEffect(() => {
    if (!visible) {
      setPage(0);
      pagerRef.current?.scrollTo({ x: 0, animated: false });
      return;
    }
    if (post && page === 0) {
      audio.playForPost(post);
    } else {
      audio.stop();
    }
    return () => audio.stop();
  }, [visible, post, page, audio]);

  const { feedItemHeight, feedCardSlotOuterHeight } = useMemo(
    () =>
      computeCommunityFeedSlotHeights({
        windowHeight: height,
        insetTop: insets.top,
        insetBottom: insets.bottom,
        safeFrameHeight: safeFrame.height,
        screenWidth: screenW,
      }),
    [height, insets.top, insets.bottom, safeFrame.height, screenW],
  );

  const onPagerScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / screenW);
      setPage(next);
    },
    [screenW],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={[styles.header, { height: HEADER_HEIGHT }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerSide}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.dots} pointerEvents="none">
            <View
              style={[
                styles.dot,
                { backgroundColor: clanColor, opacity: page === 0 ? 1 : 0.22 },
              ]}
            />
            <View
              style={[
                styles.dot,
                { backgroundColor: clanColor, opacity: page === 1 ? 1 : 0.22 },
              ]}
            />
          </View>

          <View style={styles.headerSide} />
        </View>

        {post ? (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            decelerationRate="fast"
            nestedScrollEnabled
            onMomentumScrollEnd={onPagerScrollEnd}
            scrollEventThrottle={16}
            style={styles.pager}
          >
            <View style={{ width: screenW, height: feedItemHeight }}>
              <ReflectionDetailItem
                post={post}
                itemHeight={feedItemHeight}
                previewMode
                communityVerticalFeed
                onAuthorPress={() => {}}
                onClanPress={() => {}}
                reflectionStarSurfaceColor={evoconnColors.background}
              />
            </View>

            <View
              style={{
                width: screenW,
                height: feedItemHeight,
                paddingTop: COMMUNITY_FEED_LIST_PADDING_TOP,
              }}
            >
              <CommunityPostCard
                post={post}
                followingFeedStyle
                showPhraseAuthor={post.type === 'phrase'}
                slotOuterHeight={feedCardSlotOuterHeight}
                onPress={() => {}}
                onAuthorPress={() => {}}
              />
            </View>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: evoconnColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  pager: {
    flex: 1,
  },
});
