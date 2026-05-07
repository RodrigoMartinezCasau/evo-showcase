import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import type { FriendEntry } from '@evoconn/data/mockPersonalProfile';
import { PersonalDailyPhraseWidgetBlock } from './PersonalDailyPhraseWidgetBlock';
import { PersonalFriendsBlock } from './PersonalFriendsBlock';
import { PersonalSavedPostsBlock } from './PersonalSavedPostsBlock';
import {
  BOTTOM_BLOCKS_CONTAINER_OFFSET_X,
  BOTTOM_BLOCKS_CONTAINER_OFFSET_Y,
  BOTTOM_BLOCKS_SPACING,
  BOTTOM_BLOCKS_MARGIN_HORIZONTAL,
  BOTTOM_BLOCKS_MARGIN_TOP,
  PERSONAL_BOTTOM_BLOCKS_SPACING_TOP,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  clanId: string | null;
  friends: FriendEntry[];
  savedPosts: CommunityPost[];
  onSavedPostPress?: (post: CommunityPost) => void;
};

export const PersonalBottomBlocks = React.memo(function PersonalBottomBlocks({
  clanId,
  friends,
  savedPosts,
  onSavedPostPress,
}: Props) {
  return (
    <View
      style={[
        styles.row,
        {
          gap: BOTTOM_BLOCKS_SPACING,
          marginHorizontal: BOTTOM_BLOCKS_MARGIN_HORIZONTAL,
          marginTop: BOTTOM_BLOCKS_MARGIN_TOP + PERSONAL_BOTTOM_BLOCKS_SPACING_TOP,
          transform: [
            { translateX: BOTTOM_BLOCKS_CONTAINER_OFFSET_X },
            { translateY: BOTTOM_BLOCKS_CONTAINER_OFFSET_Y },
          ],
        },
      ]}
    >
      <PersonalDailyPhraseWidgetBlock clanId={clanId} />
      <PersonalFriendsBlock friends={friends} clanId={clanId} />
      <PersonalSavedPostsBlock savedPosts={savedPosts} clanId={clanId} onPostPress={onSavedPostPress} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
