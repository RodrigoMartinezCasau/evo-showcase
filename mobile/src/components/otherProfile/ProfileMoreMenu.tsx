import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import {
  THREE_DOTS_OFFSET_X,
  THREE_DOTS_OFFSET_Y,
  THREE_DOTS_SIZE,
} from '@evoconn/constants/otherProfileLayout';

type Props = {
  userId: string;
  username: string;
};

export const ProfileMoreMenu = React.memo(function ProfileMoreMenu({ userId, username }: Props) {
  const { isFollowing, toggleFollow } = useFollowState();
  const following = isFollowing(userId);

  const handlePress = useCallback(() => {
    const followLabel = following ? 'Dejar de seguir' : 'Seguir';

    Alert.alert(
      username,
      undefined,
      [
        { text: followLabel, onPress: () => toggleFollow(userId) },
        { text: 'Bloquear usuario', style: 'destructive', onPress: () => {} },
        { text: 'Compartir perfil', onPress: () => {} },
        { text: 'Denunciar perfil', style: 'destructive', onPress: () => {} },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }, [userId, username, following, toggleFollow]);

  const pad = 8;
  const hit = Math.max(44, THREE_DOTS_SIZE + pad * 2);

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={12}
      activeOpacity={0.6}
      style={[
        styles.button,
        {
          minWidth: hit,
          minHeight: hit,
          transform: [
            { translateX: THREE_DOTS_OFFSET_X },
            { translateY: THREE_DOTS_OFFSET_Y },
          ],
        },
      ]}
    >
      <Text
        style={[
          styles.dots,
          {
            fontSize: THREE_DOTS_SIZE,
            lineHeight: THREE_DOTS_SIZE * 1.15,
          },
        ]}
      >
        ⋮
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  dots: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
