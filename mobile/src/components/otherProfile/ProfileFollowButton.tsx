import React, { useRef, useCallback, useEffect } from 'react';
import { TouchableOpacity, Animated, Text, StyleSheet } from 'react-native';
import { getFollowPlusButtonByHouse } from '@evoconn/utils/getFollowPlusButtonByHouse';
import { useFollowState } from '@evoconn/hooks/useFollowState';

type Props = {
  userId: string;
  clanId: string | null | undefined;
};

const PLUS_SIZE = 38;

export const ProfileFollowButton = React.memo(function ProfileFollowButton({ userId, clanId }: Props) {
  const { isFollowing, toggleFollow } = useFollowState();
  const following = isFollowing(userId);

  const PlusSvg = getFollowPlusButtonByHouse(clanId);

  const fadeAnim = useRef(new Animated.Value(following ? 1 : 0)).current;
  const prevFollowing = useRef(following);

  useEffect(() => {
    if (prevFollowing.current === following) return;
    prevFollowing.current = following;
    Animated.timing(fadeAnim, {
      toValue: following ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [following, fadeAnim]);

  const handlePress = useCallback(() => {
    toggleFollow(userId);
  }, [userId, toggleFollow]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={styles.button}
    >
      <Animated.View style={[styles.plusWrap, { opacity: Animated.subtract(1, fadeAnim) }]}>
        <PlusSvg width={PLUS_SIZE} height={PLUS_SIZE} />
      </Animated.View>

      <Animated.View style={[styles.textWrap, { opacity: fadeAnim }]}>
        <Text style={styles.followingText}>Siguiendo</Text>
      </Animated.View>

      <Animated.Text
        style={[
          styles.label,
          { opacity: Animated.subtract(1, fadeAnim) },
        ]}
      >
        Seguir
      </Animated.Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    minWidth: 160,
    minHeight: 52,
    gap: 10,
  },
  plusWrap: {
    position: 'absolute',
    left: 24,
  },
  textWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginLeft: 36,
    color: '#FFFFFF',
  },
});
