import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { PersonalRecentPostCard } from './PersonalRecentPostCard';
import {
  LATEST_POSTS_LABEL_OFFSET_X,
  LATEST_POSTS_LABEL_OFFSET_Y,
  LATEST_POSTS_LABEL_FONT_SIZE,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  posts: CommunityPost[];
  onPostPress: (post: CommunityPost) => void;
};

const CARD_RATIO = 0.55;
const MIN_CARD_WIDTH = 200;

export const PersonalRecentPostsSlider = React.memo(function PersonalRecentPostsSlider({ posts, onPostPress }: Props) {
  const { width: screenW } = useWindowDimensions();
  const cardW = Math.max(MIN_CARD_WIDTH, screenW * CARD_RATIO);

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PersonalRecentPostCard post={item} cardWidth={cardW} onPress={onPostPress} />
    ),
    [cardW, onPostPress],
  );

  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sin publicaciones recientes</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          {
            fontSize: LATEST_POSTS_LABEL_FONT_SIZE,
            transform: [
              { translateX: LATEST_POSTS_LABEL_OFFSET_X },
              { translateY: LATEST_POSTS_LABEL_OFFSET_Y },
            ],
          },
        ]}
      >
        Últimas publicaciones
      </Text>
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
    gap: 10,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
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
