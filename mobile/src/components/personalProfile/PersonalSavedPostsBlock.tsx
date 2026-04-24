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
  SAVED_LABEL_FONT_SIZE,
  SAVED_ICON_OFFSET_X,
  SAVED_ICON_OFFSET_Y,
  SAVED_ICON_SCALE,
  PERSONAL_BOTTOM_BLOCKS_OPACITY,
} from '@evoconn/constants/personalProfileLayout';
import type { CommunityPost } from '@evoconn/types';
import { getClanColor } from '@evoconn/constants/clanColors';

const saveIconYellow = require('../../assets/icons/smallStats/save_active.png');

const ICON_BASE = 28;

type Props = {
  savedPosts: CommunityPost[];
  clanId?: string | null;
  onPostPress?: (post: CommunityPost) => void;
};

export const PersonalSavedPostsBlock = React.memo(function PersonalSavedPostsBlock({
  savedPosts,
  clanId,
}: Props) {
  const router = useRouter();
  const titleColor = getClanColor(clanId ?? null);

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
      {/* "GUARDADOS" label */}
      <View
        style={[
          styles.labelWrap,
          {
            transform: [
              { translateX: SAVED_LABEL_OFFSET_X },
              { translateY: SAVED_LABEL_OFFSET_Y },
            ],
          },
        ]}
      >
        <Text style={[styles.label, { color: titleColor, fontSize: SAVED_LABEL_FONT_SIZE }]}>
          GUARDADOS
        </Text>
      </View>

      {/* Yellow saved icon */}
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
    backgroundColor: `rgba(0,0,0,${PERSONAL_BOTTOM_BLOCKS_OPACITY})`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  labelWrap: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
  },
  label: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  icon: {
    marginVertical: 4,
  },
});
