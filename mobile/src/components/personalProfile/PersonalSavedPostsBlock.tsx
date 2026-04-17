import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BOTTOM_BLOCK_SIZE,
  BOTTOM_BLOCK_BORDER_RADIUS,
  SAVED_BLOCK_OFFSET_X,
  SAVED_BLOCK_OFFSET_Y,
  SAVED_BLOCK_SCALE,
  SAVED_LABEL_OFFSET_X,
  SAVED_LABEL_OFFSET_Y,
  SAVED_ICON_OFFSET_X,
  SAVED_ICON_OFFSET_Y,
  SAVED_ICON_SCALE,
} from '@evoconn/constants/personalProfileLayout';
import type { CommunityPost } from '@evoconn/types';

const saveIconYellow = require('../../assets/icons/smallStats/save_active.png');

const ICON_BASE = 28;

type Props = {
  savedPosts: CommunityPost[];
  onPostPress?: (post: CommunityPost) => void;
};

export const PersonalSavedPostsBlock = React.memo(function PersonalSavedPostsBlock({
  savedPosts,
}: Props) {
  const router = useRouter();

  const iconW = ICON_BASE * SAVED_ICON_SCALE;
  const iconH = ICON_BASE * SAVED_ICON_SCALE;

  const handleOpen = useCallback(() => {
    router.push('/personal-saved-posts');
  }, [router]);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handleOpen}
      style={[
        styles.block,
        {
          width: BOTTOM_BLOCK_SIZE,
          height: BOTTOM_BLOCK_SIZE,
          borderRadius: BOTTOM_BLOCK_BORDER_RADIUS,
          transform: [
            { translateX: SAVED_BLOCK_OFFSET_X },
            { translateY: SAVED_BLOCK_OFFSET_Y },
            { scale: SAVED_BLOCK_SCALE },
          ],
        },
      ]}
    >
      {/* Label at top */}
      <Text
        style={[
          styles.label,
          {
            transform: [
              { translateX: SAVED_LABEL_OFFSET_X },
              { translateY: SAVED_LABEL_OFFSET_Y },
            ],
          },
        ]}
      >
        Guardados
      </Text>

      {/* Yellow saved icon — independently positioned */}
      <Image
        source={saveIconYellow}
        resizeMode="contain"
        style={[
          styles.icon,
          {
            width: iconW,
            height: iconH,
            transform: [{ translateX: SAVED_ICON_OFFSET_X }, { translateY: SAVED_ICON_OFFSET_Y }],
          },
        ]}
      />

    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.65,
  },
  icon: {
    marginVertical: 4,
  },
});
