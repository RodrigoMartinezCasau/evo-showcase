import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getClanColor } from '@evoconn/constants/clanColors';
import type { FriendEntry } from '@evoconn/data/mockPersonalProfile';
import {
  BOTTOM_BLOCK_SIZE,
  BOTTOM_BLOCK_BORDER_RADIUS,
  FRIENDS_BLOCK_OFFSET_X,
  FRIENDS_BLOCK_OFFSET_Y,
  FRIENDS_BLOCK_SCALE,
} from '@evoconn/constants/personalProfileLayout';

const PREVIEW_COUNT = 4;

type Props = {
  friends: FriendEntry[];
};

export const PersonalFriendsBlock = React.memo(function PersonalFriendsBlock({ friends }: Props) {
  const router = useRouter();

  const preview = friends.slice(0, PREVIEW_COUNT);

  const handleOpen = useCallback(() => {
    router.push('/personal-friends');
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
            { translateX: FRIENDS_BLOCK_OFFSET_X },
            { translateY: FRIENDS_BLOCK_OFFSET_Y },
            { scale: FRIENDS_BLOCK_SCALE },
          ],
        },
      ]}
    >
      <Text style={styles.title}>Amigos</Text>
      <View style={styles.previewList}>
        {preview.map((f) => (
          <Text
            key={f.id}
            style={[styles.previewName, { color: getClanColor(f.clanId) }]}
            numberOfLines={1}
          >
            {f.username}
          </Text>
        ))}
        {friends.length > PREVIEW_COUNT && (
          <Text style={styles.more}>+{friends.length - PREVIEW_COUNT} más</Text>
        )}
        {friends.length === 0 && (
          <Text style={styles.more}>Sin amigos aún</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    opacity: 0.65,
  },
  previewList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  previewName: {
    fontSize: 10,
    fontWeight: '600',
  },
  more: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
});
