import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { RecentPostCard } from './RecentPostCard';
import { OTHER_LATEST_POSTS_SPACING } from '@evoconn/constants/otherProfileLayout';
import { PROFILE_RECENT_POSTS_SLIDER_MAX } from '@evoconn/constants/profileRecentPosts';

type Props = {
  posts: CommunityPost[];
  onPostPress: (post: CommunityPost) => void;
  /** Shown only when there are more posts than the preview max. */
  onSeeMorePress?: () => void;
};

const CARD_RATIO = 0.55;
const MIN_CARD_WIDTH = 200;
const CARD_GAP = 12;
const SEE_MORE_KEY = '__profile_see_more__';

type CarouselItem =
  | { kind: 'post'; post: CommunityPost }
  | { kind: 'see-more' };

function sortPostsNewestFirst(list: CommunityPost[]): CommunityPost[] {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export const RecentPostsSlider = React.memo(function RecentPostsSlider({
  posts,
  onPostPress,
  onSeeMorePress,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const cardW = Math.max(MIN_CARD_WIDTH, screenW * CARD_RATIO);

  const sortedAll = useMemo(() => sortPostsNewestFirst(posts), [posts]);
  const previewPosts = useMemo(
    () => sortedAll.slice(0, PROFILE_RECENT_POSTS_SLIDER_MAX),
    [sortedAll],
  );
  const showSeeMore =
    onSeeMorePress != null && sortedAll.length > PROFILE_RECENT_POSTS_SLIDER_MAX;

  const carouselData = useMemo((): CarouselItem[] => {
    const rows: CarouselItem[] = previewPosts.map((post) => ({ kind: 'post', post }));
    if (showSeeMore) rows.push({ kind: 'see-more' });
    return rows;
  }, [previewPosts, showSeeMore]);

  const renderItem = useCallback(
    ({ item }: { item: CarouselItem }) => {
      if (item.kind === 'see-more') {
        return (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onSeeMorePress}
            style={[styles.seeMoreCard, { width: cardW }]}
          >
            <Text style={styles.seeMoreText}>ver más</Text>
          </TouchableOpacity>
        );
      }
      return <RecentPostCard post={item.post} cardWidth={cardW} onPress={onPostPress} />;
    },
    [cardW, onPostPress, onSeeMorePress],
  );

  const keyExtractor = useCallback((item: CarouselItem) => {
    if (item.kind === 'see-more') return SEE_MORE_KEY;
    return item.post.id;
  }, []);

  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sin publicaciones recientes</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { marginTop: OTHER_LATEST_POSTS_SPACING }]}>
      <FlatList
        data={carouselData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={cardW + CARD_GAP}
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
  seeMoreCard: {
    backgroundColor: '#000000',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: CARD_GAP,
    minHeight: 170,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  seeMoreText: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
