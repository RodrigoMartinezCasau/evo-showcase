import React, { useCallback, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
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

      {/* Back button — returns to profile view */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onClose}
        hitSlop={12}
        activeOpacity={0.7}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: evoconnColors.background,
    zIndex: 10,
  },
  list: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
});
