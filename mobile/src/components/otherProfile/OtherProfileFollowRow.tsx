import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  FOLLOW_ROW_PADDING_HORIZONTAL,
  FOLLOW_ROW_MIN_HEIGHT,
  FOLLOW_BUTTON_LAYOUT_WIDTH,
  FOLLOW_BUTTON_LAYOUT_HEIGHT,
  FOLLOW_BUTTON_OFFSET_X,
  FOLLOW_BUTTON_OFFSET_Y,
  FOLLOW_BUTTON_SCALE,
  FOLLOW_STATS_LAYOUT_WIDTH,
  FOLLOW_STATS_LAYOUT_HEIGHT,
  FOLLOW_STATS_OFFSET_X,
  FOLLOW_STATS_OFFSET_Y,
  FOLLOW_STATS_SCALE,
  THREE_DOTS_SIZE,
} from '@evoconn/constants/otherProfileLayout';
import { ProfileFollowButton } from './ProfileFollowButton';
import { UserFollowStats } from './UserFollowStats';
import { ProfileMoreMenu } from './ProfileMoreMenu';

type Props = {
  userId: string;
  username: string;
  clanId: string | null | undefined;
  followersCount: number;
  followingCount: number;
};

const THREE_DOTS_HIT = Math.max(44, THREE_DOTS_SIZE + 16);

export const OtherProfileFollowRow = React.memo(function OtherProfileFollowRow({
  userId,
  username,
  clanId,
  followersCount,
  followingCount,
}: Props) {
  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: FOLLOW_ROW_PADDING_HORIZONTAL, minHeight: FOLLOW_ROW_MIN_HEIGHT },
      ]}
    >
      <View
        style={[
          styles.followSlot,
          {
            width: FOLLOW_BUTTON_LAYOUT_WIDTH,
            height: FOLLOW_BUTTON_LAYOUT_HEIGHT,
            marginTop: -FOLLOW_BUTTON_LAYOUT_HEIGHT / 2,
            transform: [
              { translateX: FOLLOW_BUTTON_OFFSET_X },
              { translateY: FOLLOW_BUTTON_OFFSET_Y },
              { scale: FOLLOW_BUTTON_SCALE },
            ],
          },
        ]}
      >
        <ProfileFollowButton userId={userId} clanId={clanId} />
      </View>
      <View
        style={[
          styles.statsSlot,
          {
            width: FOLLOW_STATS_LAYOUT_WIDTH,
            height: FOLLOW_STATS_LAYOUT_HEIGHT,
            marginTop: -FOLLOW_STATS_LAYOUT_HEIGHT / 2,
            transform: [
              { translateX: FOLLOW_STATS_OFFSET_X },
              { translateY: FOLLOW_STATS_OFFSET_Y },
              { scale: FOLLOW_STATS_SCALE },
            ],
          },
        ]}
      >
        <UserFollowStats followersCount={followersCount} followingCount={followingCount} />
      </View>
      <View style={[styles.moreSlot, { marginTop: -THREE_DOTS_HIT / 2 }]}>
        <ProfileMoreMenu userId={userId} username={username} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    overflow: 'visible',
  },
  followSlot: {
    position: 'absolute',
    left: 0,
    top: '50%',
    zIndex: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  statsSlot: {
    position: 'absolute',
    right: 32,
    top: '50%',
    zIndex: 2,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  moreSlot: {
    position: 'absolute',
    right: 0,
    top: '50%',
    zIndex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
});
