import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { PersonalRecentPostCard } from './PersonalRecentPostCard';
import {
  POSTS_SECTION_PADDING_TOP,
  PERSONAL_LATEST_POSTS_SPACING,
} from '@evoconn/constants/personalProfileLayout';

type MenuAction = 'hide' | 'delete';

type Props = {
  posts: CommunityPost[];
  onPostPress: (post: CommunityPost) => void;
  /** When provided, each card shows the three-dots menu. */
  onMenuAction?: (action: MenuAction, postId: string) => void;
  /** Function to determine if a given post id is currently hidden. */
  isHiddenFn?: (id: string) => boolean;
};

const CARD_RATIO = 0.55;
const MIN_CARD_WIDTH = 200;

export const PersonalRecentPostsSlider = React.memo(function PersonalRecentPostsSlider({
  posts,
  onPostPress,
  onMenuAction,
  isHiddenFn,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const cardW = Math.max(MIN_CARD_WIDTH, screenW * CARD_RATIO);

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PersonalRecentPostCard
        post={item}
        cardWidth={cardW}
        onPress={onPostPress}
        onMenuAction={onMenuAction}
        isHidden={isHiddenFn?.(item.id)}
      />
    ),
    [cardW, onPostPress, onMenuAction, isHiddenFn],
  );

  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sin publicaciones recientes</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: POSTS_SECTION_PADDING_TOP, marginTop: PERSONAL_LATEST_POSTS_SPACING }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={cardW + 12}
        decelerationRate="fast"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
  },
  list: {
    paddingRight: 20,
  },
  emptyContainer: {
    marginHorizontal: 20,
    padding: 24,
    backgroundColor: '#000000',
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.5,
  },
});
